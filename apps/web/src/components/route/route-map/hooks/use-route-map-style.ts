import { routeMapTheme } from "../colors"
import { useTheme } from "@/components/theme-provider"
import darkMapStyle from "../../../../../public/map-styles/dark.json"
import lightMapStyle from "../../../../../public/map-styles/positron.json"

type RouteMapStyle = typeof darkMapStyle

const DIRECTION_ICON_LAYER_IDS = new Set(["road_oneway", "road_oneway_opposite"])

const removeDirectionIconLayers = (style: RouteMapStyle): RouteMapStyle => ({
  ...style,
  layers: style.layers.filter(
    (layer) => !DIRECTION_ICON_LAYER_IDS.has(layer.id)
  ),
})

const defaultRouteMapStyles = {
  dark: removeDirectionIconLayers(darkMapStyle),
  light: lightMapStyle,
} as const

export const useRouteMapStyle = () => {
  const { theme } = useTheme()
  const colors = routeMapTheme[theme]
  const configuredMapStyle =
    theme === "dark"
      ? import.meta.env.VITE_ROUTE_MAP_DARK_STYLE_URL ||
        import.meta.env.VITE_ROUTE_MAP_STYLE_URL
      : import.meta.env.VITE_ROUTE_MAP_LIGHT_STYLE_URL ||
        import.meta.env.VITE_ROUTE_MAP_STYLE_URL
  const mapStyle = configuredMapStyle || defaultRouteMapStyles[theme]

  return { colors, mapStyle }
}
