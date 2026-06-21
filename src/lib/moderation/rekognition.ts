import { RekognitionClient, DetectModerationLabelsCommand } from '@aws-sdk/client-rekognition'

const client = new RekognitionClient({
  region: process.env.AWS_REGION ?? 'eu-west-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

export async function moderateImage(imageBytes: Uint8Array): Promise<{
  approved: boolean
  flaggedLabels: string[]
}> {
  const command = new DetectModerationLabelsCommand({
    Image: { Bytes: imageBytes },
    MinConfidence: Number(process.env.AWS_REKOGNITION_MIN_CONFIDENCE ?? 75),
  })

  const response = await client.send(command)
  const labels = response.ModerationLabels ?? []

  const flaggedLabels = labels.map(l => l.Name ?? '').filter(Boolean)
  const approved = flaggedLabels.length === 0

  return { approved, flaggedLabels }
}
