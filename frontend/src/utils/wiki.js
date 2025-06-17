const baseUrl = "https://wiki.walkscape.app/wiki/";

export const getWikiUrl = (name) => {
  return `${baseUrl}${name.replaceAll(" ", "_")}`;
};
