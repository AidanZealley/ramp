export function isApplePlatform() {
  if (typeof navigator === "undefined") return false

  const userAgentData = (
    navigator as Navigator & {
      userAgentData?: { platform?: string }
    }
  ).userAgentData
  const platform =
    typeof userAgentData?.platform === "string"
      ? userAgentData.platform
      : navigator.platform

  return /mac|iphone|ipad|ipod/i.test(platform)
}
