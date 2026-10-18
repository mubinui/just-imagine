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


variable "firestore_location" {
  type        = string
  default     = "us-central1"
  description = "Permanent Firestore location; single region is the cheapest option."
}

variable "gateway_min_instances" {
  type        = number
  default     = 0
  description = "0 scales the voice gateway to zero; 1 keeps one warm instance (about $50/month)."
}

variable "web_image" {
  type        = string
  default     = ""
  description = "Web image digest; empty skips the Cloud Run web service."
}

variable "web_min_instances" {
  type        = number
  default     = 1
  description = "1 keeps one idle web instance warm so pages load instantly (about $13/month); 0 scales to zero."
}
