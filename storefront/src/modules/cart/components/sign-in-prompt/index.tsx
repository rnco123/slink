import { Button, Heading, Text } from "@medusajs/ui"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

const SignInPrompt = () => {
  return (
    <div className="flex flex-col gap-4 bg-white sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <Heading level="h2" className="font-display text-xl text-evergreen-800">
          Already have an account?
        </Heading>
        <Text className="mt-2 text-sm text-ink-muted">
          Sign in for a better experience.
        </Text>
      </div>
      <div>
        <LocalizedClientLink href="/account">
          <Button
            variant="secondary"
            className="!h-11 !rounded-pill !border-line-strong !bg-white !text-ink hover:!bg-sand-50"
            data-testid="sign-in-button"
          >
            Sign in
          </Button>
        </LocalizedClientLink>
      </div>
    </div>
  )
}

export default SignInPrompt
