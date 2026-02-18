import dayjs from "dayjs";
import advancedFormat from "dayjs";
import isBetween from "dayjs/plugin/isBetween.js";
import timezone from "dayjs/plugin/timezone.js";
import isToday from "dayjs/plugin/isToday.js";
import isTomorrow from "dayjs/plugin/isTomorrow.js";
import utc from "dayjs/plugin/utc.js";
import weekOfYear from "dayjs/plugin/weekOfYear.js";

dayjs.extend(isToday);
dayjs.extend(isTomorrow);
dayjs.extend(weekOfYear);
dayjs.extend(advancedFormat);
dayjs.extend(isBetween);
dayjs.extend(utc);
dayjs.extend(timezone);
