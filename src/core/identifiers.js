export const USER_ID_SOURCE = "[A-Za-z0-9_-]+";

const USER_ID_PATTERN = new RegExp(`^${USER_ID_SOURCE}$`);

export function validateUserId(id, label = "ID") {
  if (typeof id !== "string" || !USER_ID_PATTERN.test(id)) {
    throw new TypeError(
      `${label} must contain only letters, numbers, _ or - and must not be empty.`
    );
  }

  return id;
}
