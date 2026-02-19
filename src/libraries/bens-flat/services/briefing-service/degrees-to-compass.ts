export const degreesToCompass = (degrees: number): string => {
  const directions = [
    "north",
    "north-east",
    "east",
    "south-east",
    "south",
    "south-west",
    "west",
    "north-west",
  ];

  const index = Math.round(degrees / 45) % 8;
  return directions[index];
};
