import { init } from "@paralleldrive/cuid2";

export const createId = (length: number = 10) => {
  return init({
    length,
  })();
};
