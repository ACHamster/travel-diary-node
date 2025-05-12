import { Injectable } from '@nestjs/common';

@Injectable()
export class UserHistoryService {
  private readonly historyLimit = 20;
  private userHistories: Map<string, string[]> = new Map();

  /**
   * Add a new record to the user's browsing history.
   * @param userId The ID of the user.
   * @param recordId The ID of the record to add.
   */
  addHistory(userId: string, recordId: string): void {
    if (!this.userHistories.has(userId)) {
      this.userHistories.set(userId, []);
    }

    const history = this.userHistories.get(userId);
    if (history) {
      // Remove the record if it already exists to avoid duplication
      const existingIndex = history.indexOf(recordId);
      if (existingIndex > -1) {
        history.splice(existingIndex, 1);
      }

      // Add the new record to the front
      history.push(recordId);

      // Ensure the history does not exceed the limit
      if (history.length > this.historyLimit) {
        history.shift(); // Remove the oldest record
      }
    }
  }

  /**
   * Get the browsing history of a user in reverse order.
   * @param userId The ID of the user.
   * @returns The browsing history of the user in reverse order.
   */
  getHistory(userId: string): string[] {
    const history = this.userHistories.get(userId) || [];
    return [...history].reverse(); // 返回倒序的历史记录
  }

  /**
   * Clear the browsing history of a user.
   * @param userId The ID of the user.
   */
  clearHistory(userId: string): void {
    this.userHistories.delete(userId);
  }
}
