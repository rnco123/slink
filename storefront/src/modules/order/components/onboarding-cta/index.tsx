"use client"

import { resetOnboardingState } from "@lib/data/onboarding"
import { Button, Container, Text } from "@medusajs/ui"

const OnboardingCta = ({ orderId }: { orderId: string }) => {
  return (
    <Container className="h-full w-full max-w-4xl rounded-xl border border-line bg-sand-50 shadow-sm">
      <div className="flex flex-col items-center gap-y-4 p-4 text-center sm:p-6">
        <Text className="font-display text-lg text-evergreen-800 sm:text-xl">
          Your test order was successfully created! 🎉
        </Text>
        <Text className="text-sm text-ink-muted">
          You can now complete setting up your store in the admin.
        </Text>
        <Button
          className="!rounded-pill !bg-evergreen-700 !text-cream !shadow-none hover:!bg-evergreen-800 w-fit"
          size="xlarge"
          onClick={() => resetOnboardingState(orderId)}
        >
          Complete setup in admin
        </Button>
      </div>
    </Container>
  )
}

export default OnboardingCta
