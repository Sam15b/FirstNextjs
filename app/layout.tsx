import type React from "react"
import "@/app/globals.css"
import { ThemeProvider } from "@/components/theme-provider"

import {
  ClerkProvider,
} from '@clerk/nextjs'

export const metadata = {
  title: "ChatGPT",
  description: "A recreation of the ChatGPT interface",
  generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body>
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
            {children}
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}
