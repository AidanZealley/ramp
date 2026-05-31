import { useRef, useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { useMutation, useQuery } from "convex/react"
import { Upload } from "lucide-react"
import { toast } from "sonner"
import { api } from "#convex/_generated/api"
import { parseRouteGpxFile } from "@/lib/routes/gpx"
import { detectRouteSegments } from "@/lib/routes/segments"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { RouteCard } from "@/components/route/route-card"

export const RouteLibrary = () => {
  const savedRoutes = useQuery(api.routes.list)
  const generateUploadUrl = useMutation(api.routes.generateUploadUrl)
  const createFromGpxUpload = useMutation(api.routes.createFromGpxUpload)
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file || uploading) return

    setUploading(true)
    try {
      const result = await parseRouteGpxFile(file)
      if (result.kind === "error") {
        toast.error(`Couldn't import ${file.name}: ${result.message}`)
        return
      }
      const segments = detectRouteSegments(result.route.points)

      const uploadUrl = await generateUploadUrl()
      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type || "application/gpx+xml" },
        body: file,
      })
      if (!uploadResponse.ok) {
        throw new Error("GPX upload failed")
      }

      const { storageId } = (await uploadResponse.json()) as {
        storageId: string
      }
      const id = await createFromGpxUpload({
        title: result.route.title,
        fileStorageId: storageId as never,
        originalFileName: file.name,
        contentType: file.type || "application/gpx+xml",
        fileSizeBytes: file.size,
        stats: result.route.stats,
        bounds: result.route.bounds,
        start: result.route.start,
        finish: result.route.finish,
        previewPoints: result.route.previewPoints,
        segments,
      })

      navigate({ to: "/route/$id", params: { id } })
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Couldn't import GPX"
      )
    } finally {
      setUploading(false)
    }
  }

  if (savedRoutes === undefined) {
    return (
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-36 rounded-2xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-center">
      <div className="flex w-full max-w-5xl flex-col gap-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h1 className="font-heading text-2xl font-semibold tracking-tight">
              Routes
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Upload GPX files and ride your favourite routes.
            </p>
          </div>

          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <Upload />
            {uploading ? "Uploading" : "Upload GPX"}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".gpx,application/gpx+xml,text/xml,application/xml"
            className="hidden"
            aria-hidden="true"
            onChange={handleUploadFile}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {savedRoutes.map((routeDoc) => (
            <RouteCard
              key={routeDoc._id}
              routeDoc={routeDoc}
              onClick={() =>
                navigate({ to: "/route/$id", params: { id: routeDoc._id } })
              }
            />
          ))}
        </div>

        {savedRoutes.length === 0 && (
          <div className="rounded-lg border border-dashed border-border/60 px-6 py-12 text-center">
            <p className="text-muted-foreground">
              No routes yet. Upload a GPX file to add your first route.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
