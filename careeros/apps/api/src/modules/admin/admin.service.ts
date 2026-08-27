import { Injectable } from "@nestjs/common";

@Injectable()
export class AdminService {
  getDashboardStats() {
    return { users: 0, subscriptions: 0, revenue: 0 };
  }
}
