import BaseService from "./baseService.js";

class LocationService extends BaseService {
  constructor() {
    super("locations");
  }

  async getRealmDefaultLocations() {
    const defaults = {
      jarvonia: "kallaheim",
      herberts_guiding_grounds: "disenchanted_forest",
      erdwise: "blackspell_port",
      grand_duchy_of_trellin_erdwise: "salsfirth",
      halfling_rebels: "halfling_campgrounds",
      syrenthia: "vastalume",
      wallisia: "wraithwater",
      wrentmark: "myriadian_arc",
    };

    const locations = await this.getMultiple(Object.values(defaults));
    return locations;
  }
}

export default LocationService;
