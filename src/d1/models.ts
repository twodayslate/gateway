// RequestModel is the type of the database table called "requests".
export interface RequestModel {
  id: number;
  user_agent: string;
  cf_connecting_ip: string;
  cf_ip_country: string;
  service_id: string;
  service_name: string;
  identifier_for_vendor: string;
  bundle_identifier: string;
  url: string;
  headers: string;
  status_code: number;
  error: string;
  bundle_version: string;
}
