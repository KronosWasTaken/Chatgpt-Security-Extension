type AnalyzeRes = { ok: boolean; data?: any; error?: string }

export async function analyzePrompt(text: string, correlationId?: string, clientId?: string, mspId?: string) {
  console.log("[CS] -> background")

  const res: AnalyzeRes = await new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      {
        name: "analyze-prompt",
        body: { 
          prompt: text,
          correlationId,
          clientId,
          mspId
        }
      },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error("[CS] runtime error:", chrome.runtime.lastError)
          reject(chrome.runtime.lastError)
        } else {
          resolve(response)
        }
      }
    )
  })

  console.log("[CS] <- background")

  if (!res) {
    throw new Error("No response from background")
  }

  if (!res.ok) {
    throw new Error(res.error || "Analysis failed")
  }

  return res.data
}
