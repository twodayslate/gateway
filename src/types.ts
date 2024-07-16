export enum ServiceAuthType {
  HEADER = "HEADER",
  QUERY = "QUERY",
}

export type TError = {
  error: string;
};

export type D1ResultMeta = {
  served_by: string;
  duration: number;
  changes: number;
  last_row_id: number;
  changed_db: boolean;
  size_after: number;
};

export class ServiceType {
  static readonly DIRECT = "DIRECT";
  static readonly GATEWAY = "GATEWAY";

  static parse(value: string | null): TServiceType {
    if (value === null) {
      return ServiceType.DIRECT;
    }

    switch (value) {
      case ServiceType.DIRECT:
      case ServiceType.GATEWAY:
        return value as TServiceType;
      default:
        throw new Error("Invalid service type");
    }
  }
}

export type TServiceType = typeof ServiceType.DIRECT | typeof ServiceType.GATEWAY;
