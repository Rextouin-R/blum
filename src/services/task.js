import colors from "colors";
import delayHelper from "../helpers/delay.js";

class TaskService {
  constructor() {}

  removeDuplicatesTask(arr) {
    const seen = new Set();
    return arr.filter((item) => {
      if (seen.has(item.id)) {
        return false;
      }
      seen.add(item.id);
      return true;
    });
  }

  async getTask(user) {
    try {
      const { data } = await user.http.get(4, "tasks");
      if (data?.length) {
        return data;
      } else {
        throw new Error(`Terdapat daftar tugas yang gagal: ${data?.message}`);
      }
    } catch (error) {
      return -1;
    }
  }

  async startTask(user, task) {
    const param = `tasks/${task.id}/start`;
    let taskName = task.title;
    if (task.progressTarget) {
      taskName = `${task.title} ${task?.progressTarget?.target} ${task?.progressTarget?.postfix}`;
    }
    try {
      const { data } = await user.http.post(4, param, {});
      if (data && data.status === "STARTED") {
        return task.validationType === "KEYWORD"
          ? "READY_FOR_VERIFY"
          : "READY_FOR_CLAIM";
      } else {
        throw new Error(
          `Menjalankan tugas ${colors.blue(taskName)} kesalahan: ${data?.message}`
        );
      }
    } catch (error) {
      user.log.logError(
        `Mengerjakan tugas ${colors.blue(taskName)} - ${colors.gray(
          `[${task.id}]`
        )} Kesalahan: ${error.response?.data?.message}`
      );
      return "NOT_STARTED";
    }
  }
  async verifyTask(user, task) {
    let taskName = task.title;
    const param = `tasks/${task.id}/validate`;
    if (!user?.database?.tasks) {
      user.log.log(
        colors.yellow(
          `Tugas selesai ${colors.blue(
            taskName
          )} Belum ada tugas, menunggu tugas`
        )
      );
      return;
    }
    const taskDatabase = user?.database?.tasks.find((t) => t.id === task.id);
    if (!taskDatabase) {
      user.log.log(
        colors.yellow(
          `Tugas selesai ${colors.blue(
            taskName
          )} Belum ada tugas, menunggu tugas`
        )
      );
      return;
    }
    const body = { keyword: taskDatabase.answer };

    try {
      const { data } = await user.http.post(4, param, body);
      if (data && data.status === "READY_FOR_CLAIM") {
        return "READY_FOR_CLAIM";
      } else {
        throw new Error(
          `Konfirmasi tugas ${colors.blue(taskName)} kesalahan : ${
            data?.message
          }`
        );
      }
    } catch (error) {
      user.log.logError(
        `Konfirmasi tugas ${colors.blue(taskName)} - ${colors.gray(
          `[${task.id}]`
        )} Kesalahan : ${error.response?.data?.message}`
      );
      return "NOT_STARTED";
    }
  }

  async claimTask(user, task, showLog = true) {
    const param = `tasks/${task.id}/claim`;
    let taskName = task.title;
    if (task.progressTarget) {
      taskName = `${task.title} ${task.target} ${task.postfix}`;
    }
    try {
      const { data } = await user.http.post(4, param, {});
      if (data && data.status === "FINISHED") {
        if (showLog) {
          user.log.log(
            `Tugas berjalan ${colors.blue(
              taskName
            )} Tugas selesai, hadiah: ${colors.green(
              task.reward + user.currency
            )}`
          );
        }
        return true;
      } else {
        throw new Error(
          `Klaim hadiah tugas ${colors.blue(taskName)} kesalahan : ${
            data?.message
          }`
        );
      }
    } catch (error) {
      if (showLog) {
        user.log.logError(
          `Klaim hadiah tugas ${colors.blue(taskName)} - ${colors.gray(
            `[${task.id}]`
          )} kesalahan : ${error.response?.data?.message}`
        );
      }
      return false;
    }
  }

  async handleTaskBasic(user, dataTasks, title) {
    const skipTasks = ["39391eb2-f031-4954-bd8a-e7aecbb1f192"];

    let tasksMerge = [];
    for (const item of dataTasks) {
      tasksMerge = tasksMerge.concat(item.tasks);
    }

    const tasksFilter = tasksMerge.filter(
      (task) =>
        !skipTasks.includes(task.id) &&
        task.status !== "FINISHED" &&
        !task.isHidden
    );
    const tasks = this.removeDuplicatesTask(tasksFilter);

    const taskList = tasks.filter(
      (task) => task.type !== "PROGRESS_TARGET" && task.status !== "STARTED"
    );

    if (taskList.length) {
      user.log.log(
        `Terlihat ${colors.blue(taskList.length)} tugas berjalan ${colors.blue(
          title
        )} belum selesai`
      );
    } else {
      user.log.log(
        colors.magenta(
          `Menyelesaikan semua tugas ${colors.blue(
            title
          )} (Kecuali untuk tugas yang harus dilakukan secara manual, tugas tersebut diabaikan)`
        )
      );
    }

    await this.handleSingleTask(user, tasks);
  }

  async handleTaskMultiple(user, dataTasks, title) {
    const skipTasks = ["39391eb2-f031-4954-bd8a-e7aecbb1f192"];

    const tasksFilter = dataTasks.filter((task) => {
      if (task?.subTasks) {
        return (
          !skipTasks.includes(task.id) &&
          !task.subTasks.every((task) => task.status === "FINISHED") &&
          !task.isHidden
        );
      } else {
        return (
          !skipTasks.includes(task.id) &&
          !task.status === "FINISHED" &&
          !task.isHidden
        );
      }
    });

    if (tasksFilter.length) {
      user.log.log(
        `Terlihat ${colors.blue(tasksFilter.length)} tugas berjalan ${colors.blue(
          title
        )} belum selesai`
      );
    } else {
      user.log.log(
        colors.magenta(
          `Menyelesaikan semua tugas ${colors.blue(
            title
          )} (Kecuali untuk tugas yang harus dilakukan secara manual, tugas tersebut diabaikan)`
        )
      );
    }

    for (const taskParent of tasksFilter) {
      user.log.log(
        `Menjalankan tugas ${colors.blue(
          taskParent.title
        )}, Tunggu hingga semua tugas selesai untuk menerima hadiah`
      );

      if (!taskParent?.subTasks) {
        await this.handleSingleTask(user, [taskParent]);
      } else {
        let countDone = await this.handleSubTask(
          user,
          taskParent?.subTasks,
          taskParent?.title
        );
        if (countDone === taskParent?.subTasks?.length) {
          // await this.claimTask(user, taskParent);
          user.log.log(
            colors.magenta(
              `Menyelesaikan semua tugas ${colors.blue(
                taskParent.title
              )} (Kecuali untuk tugas yang harus dilakukan secara manual, tugas tersebut diabaikan)`
            )
          );
        } else {
          user.log.log(
            colors.yellow(
              `Tidak menyelesaikan semua tugas ${colors.blue(
                taskParent.title
              )}`
            )
          );
        }
      }
    }
  }

  async handleSingleTask(user, tasks) {
    const tasksErrorStart = [];
    const tasksErrorClaim = [];
    for (const task of tasks) {
      let complete = task.status;
      if (complete === "NOT_STARTED" && task.type !== "PROGRESS_TARGET") {
        complete = await this.startTask(user, task);
        if (complete === "NOT_STARTED") {
          tasksErrorStart.push(task);
        }
        await delayHelper.delay(3);
      }

      if (complete === "READY_FOR_VERIFY") {
        complete = await this.verifyTask(user, task);
      }
      if (complete === "READY_FOR_CLAIM") {
        const statusClaim = await this.claimTask(user, task);
        if (!statusClaim) {
          tasksErrorClaim.push(task);
        }
      }
    }

    if (tasksErrorStart.length || tasksErrorClaim.length) {
      user.log.log(colors.magenta("Menjalankan kembali tugas yang gagal..."));
      for (const task of tasksErrorStart) {
        let complete = task.status;
        if (complete === "NOT_STARTED" && task.type !== "PROGRESS_TARGET") {
          complete = await this.startTask(user, task);
        }
        if (complete === "READY_FOR_VERIFY") {
          complete = await this.verifyTask(user, task);
        }
        if (complete === "READY_FOR_CLAIM") {
          await this.claimTask(user, task);
        }
      }
      for (const task of tasksErrorClaim) {
        await this.claimTask(user, task);
      }
    }
  }

  async handleSubTask(user, subTask, nameTaskParent) {
    let countDone = 0;
    for (const task of subTask) {
      let complete = task.status;
      if (complete === "FINISHED") {
        countDone++;
        user.log.log(
          `✔️ Tugas selesai ${colors.blue(
            nameTaskParent + " --> " + task.title
          )}`
        );
        continue;
      }
      if (complete === "NOT_STARTED" && task.type !== "PROGRESS_TARGET") {
        complete = await this.startTask(user, task);
        await delayHelper.delay(3);
      }
      if (complete === "READY_FOR_VERIFY") {
        complete = await this.verifyTask(user, task);
      }
      if (complete === "READY_FOR_CLAIM" || complete === "STARTED") {
        const statusClaim = await this.claimTask(user, task, false);
        if (statusClaim) {
          countDone++;
          user.log.log(
            `✔️ Tugas selesai ${colors.blue(
              nameTaskParent + " --> " + task.title
            )}`
          );
        } else {
          user.log.logError(
            `❌ Tugas tidak berjalan ${colors.blue(
              nameTaskParent + " --> " + task.title
            )} Kegagalan`
          );
        }
      }
    }
    return countDone;
  }

  async handleTask(user) {
    const maxRetryGetTask = 10;
    let countGetTask = 0;
    let tasks = await this.getTask(user);

    while (tasks === -1 && countGetTask <= maxRetryGetTask) {
      countGetTask++;
      tasks = await this.getTask(user);
    }

    if (countGetTask > maxRetryGetTask) {
      user.log.logError(`Terdapat daftar misi yang gagal`);
      return;
    }

    for (const task of tasks) {
      if (task?.sectionType === "DEFAULT") {
        await this.handleTaskBasic(user, task.subSections, task.sectionType);
      } else {
        await this.handleTaskMultiple(user, task.tasks, task.sectionType);
      }
    }

    user.log.log(colors.magenta("Menyelesaikan tugas"));
  }
}

const taskService = new TaskService();
export default taskService;
