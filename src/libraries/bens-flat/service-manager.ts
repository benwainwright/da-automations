import { ServiceFunction } from "@digital-alchemy/core";
import chalk from "chalk";

type ServiceWithDeps<T> =
  | {
      dependencies?: readonly (keyof T)[];
      func: ServiceFunction;
    }
  | ServiceFunction;

type ServiceMapFromServiceMapWithDeps<T> =
  T extends Record<string, ServiceWithDeps<T>>
    ? { [K in keyof T]: T[K] extends { func: ServiceFunction } ? T[K]["func"] : T[K] }
    : never;

const assertNoCycle = <const TServiceMap extends Record<string, ServiceWithDeps<TServiceMap>>>(
  nextName: keyof TServiceMap,
  chain?: Set<keyof TServiceMap>,
) => {
  if (chain?.has(nextName)) {
    const theChain = Array.from([...chain.keys(), nextName])
      .map((service) => (service === nextName ? chalk.blue(String(service)) : String(service)))
      .join(" -> ");

    throw new Error(`Cycle detected: ${nextName.toString()}: ${theChain}`);
  }
};

const getServiceEntry = <const TServiceMap extends Record<string, ServiceWithDeps<TServiceMap>>>(
  services: TServiceMap,
  name: keyof TServiceMap,
): [string, ServiceWithDeps<TServiceMap>] => {
  const service = services[name];

  if (!service) {
    throw new Error(`Service not found: ${String(name)}`);
  }

  return [String(name), service];
};

const collectDependencies = <
  const TServiceMap extends Record<string, ServiceWithDeps<TServiceMap>>,
>(
  services: TServiceMap,
  name: keyof TServiceMap,
  all: Set<keyof TServiceMap>,
  chain?: Set<keyof TServiceMap>,
): [serviceName: string, service: ServiceWithDeps<TServiceMap>][] => {
  assertNoCycle<TServiceMap>(name, chain);

  if (all.has(name)) {
    return [];
  }

  const [, service] = getServiceEntry(services, name);

  all.add(name);

  if (typeof service === "function") {
    return [[String(name), service]];
  }

  return [
    ...(service.dependencies?.flatMap((dependency) => {
      const nextChain = new Set(chain);
      nextChain.add(name);
      return collectDependencies(services, dependency, all, nextChain);
    }) ?? []),
    [String(name), service],
  ];
};

const renderDependencySubtree = <
  const TServiceMap extends Record<string, ServiceWithDeps<TServiceMap>>,
>(
  services: TServiceMap,
  name: keyof TServiceMap,
  prefix = "",
  isLast = true,
  chain?: Set<keyof TServiceMap>,
  isRoot = false,
): string[] => {
  assertNoCycle<TServiceMap>(name, chain);

  const [, service] = getServiceEntry(services, name);

  const line = isRoot ? String(name) : `${prefix}${isLast ? "└── " : "├── "}${String(name)}`;

  if (typeof service === "function") {
    return [line];
  }

  const dependencies = [...(service.dependencies ?? [])];
  const childPrefix = isRoot ? "" : `${prefix}${isLast ? "    " : "│   "}`;

  return [
    line,
    ...dependencies.flatMap((dependency, index) => {
      const nextChain = new Set(chain);
      nextChain.add(name);

      return renderDependencySubtree(
        services,
        dependency,
        childPrefix,
        index === dependencies.length - 1,
        nextChain,
        false,
      );
    }),
  ];
};

const printDependencyTree = <
  const TServiceMap extends Record<string, ServiceWithDeps<TServiceMap>>,
>(
  services: TServiceMap,
) => {
  console.log(chalk.bold("Dependency tree"));

  Object.keys(services).forEach((name, index, array) => {
    const lines = renderDependencySubtree(
      services,
      name as keyof TServiceMap,
      "",
      true,
      new Set(),
      true,
    );

    console.log(lines.join("\n"));

    if (index < array.length - 1) {
      console.log("");
    }
  });
};
export const generateServiceMapWithPriorities = <
  const TServiceMapWithDeps extends Record<string, ServiceWithDeps<TServiceMapWithDeps>>,
>(config: {
  services: TServiceMapWithDeps;
}): {
  priorityInit: (keyof TServiceMapWithDeps)[];
  services: ServiceMapFromServiceMapWithDeps<TServiceMapWithDeps>;
} => {
  console.log("Analysing service order");

  printDependencyTree(config.services);

  const all = new Set<keyof TServiceMapWithDeps>();

  const services = Object.keys(config.services).flatMap((name) => {
    const chain = new Set<keyof TServiceMapWithDeps>();
    return collectDependencies(config.services, name as keyof TServiceMapWithDeps, all, chain);
  });

  const priorityInit = services.map(([serviceName]) => serviceName as keyof TServiceMapWithDeps);

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
