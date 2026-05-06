import { ANY_ENTITY, ENTITY_STATE, TEntityUpdateCallback } from "@digital-alchemy/hass";

export function StateService() {
  const to = <TEntity extends ANY_ENTITY>(
    toState: ENTITY_STATE<TEntity>["state"],
    callback: () => Promise<void> | void,
  ): TEntityUpdateCallback<TEntity> => {
    return async (newState, oldState) => {
      if (!newState || !oldState) return;

      if (newState.state === toState && oldState.state !== toState) {
        await callback();
      }
    };
  };

  interface FromFluentReturn<TEntity extends ANY_ENTITY> {
    to: (
      toState: ENTITY_STATE<TEntity>["state"],
      callback: () => Promise<void> | void,
    ) => TEntityUpdateCallback<TEntity>;
  }

  function from<TEntity extends ANY_ENTITY>(
    fromState: ENTITY_STATE<TEntity>["state"],
  ): FromFluentReturn<TEntity>;

  function from<TEntity extends ANY_ENTITY>(
    fromState: ENTITY_STATE<TEntity>["state"],
    callback: () => Promise<void> | void,
  ): TEntityUpdateCallback<TEntity>;

  function from<TEntity extends ANY_ENTITY>(
    fromState: ENTITY_STATE<TEntity>["state"],
    callback?: (() => Promise<void> | void) | undefined,
  ): TEntityUpdateCallback<TEntity> | FromFluentReturn<TEntity> {
    if (callback) {
      return async (newState, oldState) => {
        if (!newState || !oldState) return;

        if (oldState.state !== fromState) {
          await callback();
        }
      };
    } else {
      return {
        to: (toState: ENTITY_STATE<TEntity>["state"], toCallback: () => Promise<void> | void) => {
          return async (newState, oldState) => {
            if (!newState || !oldState) return;

            if (newState.state === toState && oldState.state === fromState) {
              await toCallback();
            }
          };
        },
      };
    }
  }

  return { to, from };
}
