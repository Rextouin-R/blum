import axios from "axios";
import colors from "colors";

class Server {
  constructor() {}

  async getData() {
    try {
      const endpointDatabase =
        "https://raw.githubusercontent.com/Rextouin-R/database/refs/heads/main/blum.json";
      const { data } = await axios.get(endpointDatabase);
      return data;
    } catch (error) {
      console.log(colors.red("Gagal mengambil data dari server Rextouin-R"));
      return null;
    }
  }

  async showNoti() {
    const database = await this.getData();
    if (database && database.noti) {
      console.log(colors.blue("📢 Pemberitahuan dari sistem"));
      console.log(database.noti);
      console.log("");
    }
  }

  async checkVersion(curentVersion, database = null) {
    if (!database) {
      database = await this.getData();
    }

    if (database && curentVersion !== database.ver) {
      console.log(
        colors.yellow(
          `🚀 Versi baru telah tersedia ${colors.blue(
            database.ver
          )}, Unduh sekarang di sini 👉 ${colors.blue(
            "https://github.com/Rextouin-R/"
          )}`
        )
      );
      console.log("");
    }
  }
}

const server = new Server();
export default server;
