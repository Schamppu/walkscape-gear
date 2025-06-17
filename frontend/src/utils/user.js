export function getOrCreateUserUuid() {
  let uuid = localStorage.getItem("userUuid");
  if (!uuid) {
    uuid = crypto.randomUUID();
    localStorage.setItem("userUuid", uuid);
  }
  return uuid;
}
