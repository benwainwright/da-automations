import dayjs from "dayjs";

export const getDateAndTimeString = () => {
  const now = dayjs();

  const getOrdinal = (day: number) => {
    if (day > 3 && day < 21) return "th";
    switch (day % 10) {
      case 1:
        return "st";
      case 2:
        return "nd";
      case 3:
        return "rd";
      default:
        return "th";
    }
  };

  const time = now.format("h:mm A");
  const day = now.format("dddd");
  const dateNumber = now.date();
  const month = now.format("MMMM");

  return `The time is ${time} on ${day} the ${dateNumber}${getOrdinal(dateNumber)} of ${month}.`;
};
