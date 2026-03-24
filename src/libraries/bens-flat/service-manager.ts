import { ServiceFunction } from "@digital-alchemy/core";
import chalk from "chalk";

type ServiceMapFromServiceMapWithDeps<T> =
  T extends Record<
    string,
    | {
        dependencies?: readonly (keyof T)[];
        func: ServiceFunction;
      }
    | ServiceFunction
  >
    ? { [K in keyof T]: T[K] extends { func: ServiceFunction } ? T[K]["func"] : T[K] }
    : never;

const assertNoCycle = <
  const TServiceMap extends Record<
    string,
    | {
        dependencies?: readonly (keyof TServiceMap)[];
        func: ServiceFunction;
      }
    | ServiceFunction
  >,
>(
  nextName: keyof TServiceMap,
  chain?: Set<keyof TServiceMap>,
) => {
  if (chain?.has(nextName)) {
    const theChain = Array.from([...chain.keys(), nextName])
      .map((service) => (service === nextName ? chalk.blue(service) : service))
      .join(" -> ");

    throw new Error(`Cycle detected: ${nextName.toString()}: ${theChain}`);
  }
};

const collectDependencies = <
  const TServiceMap extends Record<
    string,
    | {
        dependencies?: readonly (keyof TServiceMap)[];
        func: ServiceFunction;
      }
    | ServiceFunction
  >,
>(
  services: TServiceMap,
  name: keyof TServiceMap,
  all: Set<keyof TServiceMap>,
  chain?: Set<keyof TServiceMap>,
): [
  serviceName: string,
  service:
    | {
        dependencies?: readonly (keyof TServiceMap)[];
        func: ServiceFunction;
      }
    | ServiceFunction,
][] => {
  assertNoCycle<TServiceMap>(name, chain);

  if (all.has(name)) {
    return [];
  }
  all.add(name);
  const theService = Object.entries(services).find(([key]) => key === name);

  if (!theService) {
    throw new Error(`Service not found`);
  }

  const [serviceName, service] = theService;

  if (typeof service === "function") {
    return [theService];
  }

  return [
    ...(service.dependencies?.flatMap((dependency) => {
      const nextChain = new Set(chain);
      nextChain.add(name);
      return collectDependencies(services, dependency, all, nextChain);
    }) ?? []),
    [serviceName, service],
  ];
};

export const generateServiceMapWithPriorities = <
  const TServiceMapWithDeps extends Record<
    string,
    | {
        dependencies?: readonly (keyof TServiceMapWithDeps)[];
        func: ServiceFunction;
      }
    | ServiceFunction
  >,
>(config: {
  services: TServiceMapWithDeps;
}): {
  priorityInit: (keyof TServiceMapWithDeps)[];
  services: ServiceMapFromServiceMapWithDeps<TServiceMapWithDeps>;
} => {
  const all = new Set<keyof TServiceMapWithDeps>();

  const services = Object.keys(config.services).flatMap((name) => {
    const chain = new Set<keyof TServiceMapWithDeps>();
    return collectDependencies(config.services, name, all, chain);
  });

  const priorityInit = services.map(([serviceName]) => serviceName);

  const finalServices = Object.fromEntries(
    services.map(([name, service]) => [
      name,
      typeof service === "function" ? service : service.func,
    ]),
  );

  return {
    priorityInit,
    services: finalServices as ServiceMapFromServiceMapWithDeps<TServiceMapWithDeps>,
  };
};
