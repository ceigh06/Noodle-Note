import { useEffect, useRef, useState } from 'react'
import {
  Check,
  Eye,
  EyeOff,
  ExternalLink,
  HardDrive,
  KeyRound,
  LoaderCircle,
  ShieldCheck,
  X
} from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { providers, testAndSaveKey, type Provider } from '@/lib/byok'
import { useUI } from '@/store/ui'

export function KeySetupWizard({
  open,
  onOpenChange
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}): React.ReactNode {
  const [provider, setProvider] = useState<Provider>('gemini')
  const [key, setKey] = useState('')
  const [visible, setVisible] = useState(false)
  const [secure, setSecure] = useState(false)
  const [status, setStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')
  const [error, setError] = useState('')
  const request = useRef(0)
  const setAi = useUI((s) => s.setAi)

  useEffect(() => {
    let active = true
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset to safe default before async bridge check completes
      setSecure(false)
      window.noodleSecureKeys
        ?.isSecureStorageAvailable()
        .then((available) => {
          if (active) setSecure(available)
        })
        .catch(() => {
          if (active) setSecure(false)
        })
    }
    return () => {
      active = false
      request.current += 1
    }
  }, [open])

  const close = (): void => {
    request.current += 1
    setKey('')
    setVisible(false)
    setStatus('idle')
    setError('')
    onOpenChange(false)
  }

  const save = async (): Promise<void> => {
    const id = ++request.current
    setStatus('testing')
    setError('')
    try {
      const result = await testAndSaveKey(provider, key, window.noodleSecureKeys)
      if (id !== request.current) return
      if (!result.success) {
        setStatus('error')
        setError('Connection failed. Check your key, provider access and network, then try again.')
        return
      }
      setKey('')
      setVisible(false)
      setStatus('success')
      setAi(true)
    } catch {
      if (id !== request.current) return
      setStatus('error')
      setError(
        secure
          ? 'Connection failed. Check your key and network, then try again.'
          : 'Secure saving is unavailable in this preview. No key was sent or saved.'
      )
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && status !== 'testing') close()
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="w-[calc(100%-2rem)] max-w-lg gap-0 overflow-hidden rounded-lg border-border bg-popover p-0 shadow-float"
        onEscapeKeyDown={(e) => {
          if (status === 'testing') e.preventDefault()
        }}
        onPointerDownOutside={(e) => {
          if (status === 'testing') e.preventDefault()
        }}
      >
        <header className="flex items-center justify-between border-b border-border bg-card px-5 py-3">
          <span className="flex items-center gap-2 text-xs font-semibold">
            <KeyRound className="h-4 w-4 text-primary" />
            Cloud connection
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            aria-label="Close key setup"
            disabled={status === 'testing'}
            onClick={close}
          >
            <X />
          </Button>
        </header>
        <div className="px-6 py-6">
          <DialogTitle className="text-xl tracking-normal">Bring your own key</DialogTitle>
          <DialogDescription className="mt-2 text-sm">Optional cloud synthesis</DialogDescription>
          {status === 'success' ? (
            <div className="py-8 text-center" role="status">
              <Check className="mx-auto h-10 w-10 text-cat-projects" />
              <h2 className="mt-4 font-semibold">Connected to {providers[provider].name}</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                API access verified. Key saved securely.
              </p>
              <Button onClick={close} className="mt-6 rounded-md">
                Done
              </Button>
            </div>
          ) : (
            <>
              <Tabs
                value={provider}
                onValueChange={(value) => {
                  request.current += 1
                  setProvider(value as Provider)
                  setKey('')
                  setVisible(false)
                  setStatus('idle')
                  setError('')
                }}
                className="mt-6"
              >
                <TabsList className="grid h-auto w-full grid-cols-3 rounded-md">
                  <TabsTrigger
                    value="openai"
                    disabled={status === 'testing'}
                    className="px-1 py-2 text-xs"
                  >
                    OpenAI
                  </TabsTrigger>
                  <TabsTrigger
                    value="anthropic"
                    disabled={status === 'testing'}
                    className="px-1 py-2 text-xs"
                  >
                    Claude
                  </TabsTrigger>
                  <TabsTrigger
                    value="gemini"
                    disabled={status === 'testing'}
                    className="px-1 py-2 text-xs"
                  >
                    Google Gemini
                  </TabsTrigger>
                </TabsList>
                {(Object.keys(providers) as Provider[]).map((id) => (
                  <TabsContent key={id} value={id} className="mt-4 min-h-20">
                    <h2 className="text-sm font-semibold">{providers[id].name}</h2>
                    {id === 'gemini' ? (
                      <>
                        <span className="mt-2 inline-block rounded-sm bg-cat-projects/15 px-2 py-1 text-[11px] font-medium text-cat-projects">
                          Free tier available · student-friendly
                        </span>
                        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                          Model and rate limits apply. Free-tier content may be used to improve
                          Google products. Student plans do not guarantee API credits.
                        </p>
                      </>
                    ) : (
                      <p className="mt-2 text-xs text-muted-foreground">
                        API usage is billed separately from chat subscriptions.
                      </p>
                    )}
                  </TabsContent>
                ))}
              </Tabs>
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  void save()
                }}
                className="mt-5"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <label htmlFor="cloud-api-key" className="text-xs font-semibold">
                    API key
                  </label>
                  <Button asChild variant="link" className="h-auto p-0 text-xs">
                    <a
                      href={providers[provider].dashboard}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Get your key here
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </Button>
                </div>
                <div className="relative">
                  <Input
                    id="cloud-api-key"
                    type={visible ? 'text' : 'password'}
                    value={key}
                    onChange={(e) => {
                      setKey(e.target.value)
                      setStatus('idle')
                      setError('')
                    }}
                    placeholder={providers[provider].placeholder}
                    autoComplete="off"
                    spellCheck={false}
                    autoCapitalize="none"
                    disabled={status === 'testing'}
                    className="h-10 rounded-md bg-background pr-11 font-mono text-xs"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1 h-8 w-8"
                    aria-label={visible ? 'Hide API key' : 'Show API key'}
                    title={visible ? 'Hide API key' : 'Show API key'}
                    disabled={status === 'testing'}
                    onClick={() => setVisible((v) => !v)}
                  >
                    {visible ? <EyeOff /> : <Eye />}
                  </Button>
                </div>
                <div className="mt-4 flex items-start gap-2 border-l-2 border-cat-projects bg-cat-projects/5 p-3">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-cat-projects" />
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {secure
                      ? 'Stored securely via OS-level encryption (safeStorage). Never shared or sent anywhere except official provider APIs.'
                      : 'Desktop storage: OS-level encryption (safeStorage). Browser preview: secure storage unavailable; keys are never sent or saved.'}
                  </p>
                </div>
                {error && (
                  <p role="alert" className="mt-3 text-xs leading-relaxed text-destructive">
                    {error}
                  </p>
                )}
                <Button
                  type="submit"
                  className="mt-5 h-10 w-full rounded-md"
                  disabled={!key.trim() || status === 'testing'}
                >
                  {status === 'testing' ? (
                    <>
                      <LoaderCircle className="animate-spin motion-reduce:animate-none" />
                      Testing connection…
                    </>
                  ) : (
                    <>
                      <ShieldCheck />
                      Test Connection &amp; Save
                    </>
                  )}
                </Button>
              </form>
              <Button
                variant="ghost"
                className="mt-2 h-auto min-h-9 w-full whitespace-normal rounded-md text-xs text-muted-foreground"
                disabled={status === 'testing'}
                onClick={() => {
                  setAi(false)
                  close()
                }}
              >
                <HardDrive />
                Skip for Now (Local Mode Only)
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
