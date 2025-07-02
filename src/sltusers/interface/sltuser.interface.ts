export interface SLTUser {
  id: string;
  azureId: string;
  serviceNum: string;
  displayName: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
  role: 'user' | 'admin' | 'technician' | 'teamLeader' | 'superAdmin';
}
