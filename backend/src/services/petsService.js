import BaseService from "./baseService.js";

class PetsService extends BaseService {
  constructor() {
    super("pets");
  }

  async fetchPets() {
    const data = await this.list();
    const ids = data.map(({ id }) => id);
    return await this.getMultiple(ids);
  }
}

export default PetsService;
