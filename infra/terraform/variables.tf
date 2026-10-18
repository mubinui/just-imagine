variable "project_id" {
  type = string
}

variable "web_url" {
  type = string
}

variable "image" {
  type        = string
  description = "Immutable Artifact Registry image digest containing all service entrypoints"

}

variable "asset_bucket" {
  type = string
}

variable "stripe_price_id" {
  type    = string
  default = ""

}

variable "enable_billing" {
  type    = bool
  default = false

}

variable "subscriptions_without_payment" {
  type        = bool
  default     = true
  description = "Parents can start the Family plan without paying while Stripe billing is off. Ignored when enable_billing is true."
}

variable "models" {

  type = map(string)
  default = {
    LIVE_MODEL = "gemini-3.8-live", FAST_MODEL = "gemini-3.8-flash", SCENE_MODEL = "gemini-4-argon", HERO_MODEL = "gemini-nano-banana-2.1", PROP_MODEL = "gemini-3.1-flash-lite-image"
  }


}

