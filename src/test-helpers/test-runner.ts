import { LIB_AUTOMATION } from "@digital-alchemy/automation";
import { LIB_HASS } from "@digital-alchemy/hass";
import { hassTestRunner, LIB_MOCK_ASSISTANT } from "@digital-alchemy/hass/mock-assistant";
import { LIB_BENS_FLAT } from "@libraries";
hassTestRunner.appendLibrary(LIB_MOCK_ASSISTANT);
hassTestRunner.appendLibrary(LIB_AUTOMATION);
hassTestRunner.appendLibrary(LIB_HASS);
hassTestRunner.appendLibrary(LIB_BENS_FLAT);

export { hassTestRunner as testRunner };
