import colors from "colors";

class InviteClass {
  constructor() {}

  async getBalanceInvite(user) {
    try {
      const { data } = await user.http.get(3, "friends/balance");
      if (data) {
        return data;
      } else {
        throw new Error(
          `Gagal mengambil informasi undangan teman: ${data.message}`
        );
      }
    } catch (error) {
      user.log.logError(
        `Gagal mengambil informasi undangan teman: ${error.response?.data?.message}`
      );
      return 0;
    }
  }

  async claimInvite(user) {
    try {
      const { data } = await user.http.post(3, "friends/claim", {});
      if (data) {
        user.log.log(
          `Klaim poin undangan berhasil, diterima: ${colors.green(
            data?.claimBalance + user.currency
          )}`
        );
        return true;
      } else {
        throw new Error(`Klaim undangan teman gagal: ${data.message}`);
      }
    } catch (error) {
      user.log.logError(
        `Klaim undangan teman gagal: ${error.response?.data?.message}`
      );
      return false;
    }
  }

  async handleInvite(user) {
    const balance = await this.getBalanceInvite(user);
    if (balance.amountForClaim > 0 && balance.canClaim) {
      await this.claimInvite(user);
    }
  }
}

const inviteClass = new InviteClass();
export default inviteClass;
