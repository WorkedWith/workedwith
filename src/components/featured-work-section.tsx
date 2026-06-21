'use client'

import { useState } from 'react'
import type { FeaturedJobPublic } from '@/actions/featured-jobs/get-featured-jobs'

type Props = {
  jobs: FeaturedJobPublic[]
  supabaseUrl: string
}

function imgUrl(supabaseUrl: string, storagePath: string): string {
  return `${supabaseUrl}/storage/v1/object/public/featured-job-images/${storagePath}`
}

export function FeaturedWorkSection({ jobs, supabaseUrl }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (jobs.length === 0) return null

  return (
    <section>
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400 px-1">
        Featured work
      </h2>
      <div className="space-y-4">
        {jobs.map(job => {
          const isExpanded = expandedId === job.id
          const preview = job.images.slice(0, 3)

          return (
            <div
              key={job.id}
              className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <h3 className="font-semibold text-brand-navy">{job.title}</h3>
                  {job.job_id && (
                    <span className="mt-1 inline-flex items-center rounded-full bg-green-50 border border-green-200 px-2.5 py-0.5 text-xs font-medium text-green-700">
                      Linked to verified job
                    </span>
                  )}
                </div>
                {job.images.length > 0 && (
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : job.id)}
                    className="shrink-0 text-xs font-medium text-brand-amber hover:underline"
                  >
                    {isExpanded ? 'Show less' : `View all ${job.images.length}`}
                  </button>
                )}
              </div>

              {job.images.length === 0 ? null : isExpanded ? (
                /* Expanded — all images with captions */
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {job.images.map(img => (
                    <div key={img.id} className="space-y-1.5">
                      <div className="aspect-square overflow-hidden rounded-xl bg-gray-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={imgUrl(supabaseUrl, img.storage_path)}
                          alt={img.caption ?? job.title}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      </div>
                      {img.caption && (
                        <p className="text-xs text-gray-500 leading-relaxed">{img.caption}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                /* Preview — up to 3 images */
                <button
                  onClick={() => setExpandedId(job.id)}
                  className="w-full text-left"
                >
                  <div className={`grid gap-2 ${preview.length === 1 ? 'grid-cols-1' : preview.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                    {preview.map(img => (
                      <div key={img.id} className="aspect-square overflow-hidden rounded-xl bg-gray-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={imgUrl(supabaseUrl, img.storage_path)}
                          alt={img.caption ?? job.title}
                          className="h-full w-full object-cover hover:opacity-90 transition-opacity"
                          loading="lazy"
                        />
                      </div>
                    ))}
                  </div>
                  {job.images.length > 3 && (
                    <p className="mt-2 text-xs text-gray-400 text-center">
                      +{job.images.length - 3} more — click to view all
                    </p>
                  )}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
