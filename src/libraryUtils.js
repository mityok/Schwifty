export const getPropertyFromTo = (property, toVars, fromVars, fallBack) => {
  return (fromVars && fromVars[property]) || (toVars && toVars[property]) || fallBack;
};