type Task = () => Promise<void>;

class MemoryQueue {
  private queue: Task[] = [];
  private running = false;

  enqueue(task: Task) {
    this.queue.push(task);
    this.run();
  }

  private async run() {
    if (this.running) return;
    this.running = true;

    while (this.queue.length > 0) {
      const task = this.queue.shift();
      if (task) {
        try {
          await task();
        } catch (e) {
          console.error("큐 처리 중 에러:", e);
        }
      }
    }

    this.running = false;
  }
}

export const applyQueue = new MemoryQueue();
