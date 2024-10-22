import colors from "colors";
import dayjs from "dayjs";

class FarmingClass {
  constructor() {}

  async startFarming(user) {
    try {
      const { data } = await user.http.post(0, "farming/start", {});
      if (data) {
        user.log.log(
          `Mulai bertani, menunggu klaim berikut: ${colors.blue("480 menit")}`
        );
        return true;
      } else {
        throw new Error(`Mulai bertani gagal: ${data.message}`);
      }
    } catch (error) {
      user.log.logError(
        `Mulai bertani gagal: ${error.response?.data?.message}`
      );
      return false;
    }
  }

  async claimFarming(user, balance) {
    try {
      const { data } = await user.http.post(0, "farming/claim", {});
      if (data) {
        user.log.log(
          `Berhasil klaim pertanian, hasil: ${colors.green(
            balance + user.currency
          )}`
        );
        return true;
      } else {
        throw new Error(`Klaim pertanian gagal: ${data.message}`);
      }
    } catch (error) {
      user.log.logError(
        `Gagal claim pertanian: ${error.response?.data?.message}`
      );
      return false;
    }
  }

  async handleFarming(user, infoFarming) {
    if (!infoFarming) {
      await this.startFarming(user);
      return 480;
    } else {
      const diffTimeClaim = dayjs().diff(dayjs(infoFarming?.endTime), "minute");

      if (diffTimeClaim > 0) {
        const statusClaim = await this.claimFarming(user, infoFarming?.balance);
        if (statusClaim) {
          await this.startFarming(user);
          return 480;
        } else {
          return 5;
        }
      } else {
        user.log.log(
          `Ini belum waktunya untuk mengklaim, tunggu sampai nanti: ${colors.blue(
            Math.abs(diffTimeClaim) + " menit"
          )}`
        );
        return Math.abs(diffTimeClaim);
      }
    }
  }
}

const farmingClass = new FarmingClass();
export default farmingClass;
