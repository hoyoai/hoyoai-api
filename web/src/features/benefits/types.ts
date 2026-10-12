/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
export type MembershipTier = {
  group: string
  name: string
  ratio: number
  rpm: number
  total_limit: number
  success_limit: number
}

export type MembershipChannel = {
  key: string
  name: string
  ratio: number
}

export type MembershipVendor = {
  id: number
  name: string
  icon?: string
}

export type MembershipModel = {
  model_name: string
  vendor_id?: number
  quota_type: number
  model_ratio: number
  model_price: number
  completion_ratio: number
}

export type MembershipEnterprise = {
  name: string
  contact_phone: string
}

export type MembershipData = {
  rate_limit_enabled: boolean
  duration_minutes: number
  tiers: MembershipTier[]
  channels?: MembershipChannel[]
  vendors?: MembershipVendor[]
  models?: MembershipModel[]
  enterprise: MembershipEnterprise
}

export type MembershipResponse = {
  success: boolean
  message?: string
  data?: MembershipData
  from_cache?: boolean
}
