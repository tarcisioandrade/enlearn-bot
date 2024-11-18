export const fixFileName = (file: string | undefined) => {
  if (!file) {
    return undefined;
  }
  const replacedSlash = file.replace(/\//g, "__");
  const replacedColon = replacedSlash.replace(/:/g, "-");
  return replacedColon;
};
