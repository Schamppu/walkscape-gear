/**
 * Utility functions for managing user-related data in local storage.
 *
 * Functions:
 * - `getOrCreateUserUuid()`: Retrieves a unique user identifier (UUID) from local storage.
 *    If it doesn't exist, it generates a new UUID using the `crypto.randomUUID()` method,
 *    stores it in local storage under the key "userUuid", and returns it.
 *    This function ensures that each user has a consistent identifier across sessions.
 */

export function getOrCreateUserUuid(): string {
  let uuid = localStorage.getItem("userUuid");
  if (!uuid) {
    uuid = crypto.randomUUID();
    localStorage.setItem("userUuid", uuid);
  }
  return uuid;
}
