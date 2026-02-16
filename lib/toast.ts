"use client"

import type { ReactNode } from "react"
import { sileo } from "sileo"
import type { SileoOptions, SileoPosition } from "sileo"

type ToastAction = {
  label: string
  onClick: () => void
}

export type ToastOptions = {
  description?: ReactNode | string
  position?: SileoPosition
  duration?: number | null
  icon?: ReactNode | null
  styles?: SileoOptions["styles"]
  fill?: string
  roundness?: number
  autopilot?: SileoOptions["autopilot"]
  action?: ToastAction
}

type ToastPromisePhase = ToastOptions & {
  title: string
}

type ToastPromiseOptions<T> = {
  loading: ToastPromisePhase
  success: ToastPromisePhase | ((data: T) => ToastPromisePhase)
  error?: ToastPromisePhase | ((error: unknown) => ToastPromisePhase)
  position?: SileoPosition
}

type SileoInternalOptions = SileoOptions & {
  id?: string
  state?: "success" | "loading" | "error" | "warning" | "info" | "action"
}

const createToastId = () => {
  return `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

const getErrorMessage = (error: unknown): string | undefined => {
  if (error instanceof Error) return error.message
  if (typeof error === "string") return error
  if (!error || typeof error !== "object") return undefined

  const maybeMessage = (error as { message?: unknown }).message
  return typeof maybeMessage === "string" ? maybeMessage : undefined
}

const buildOptions = (title: string, options?: ToastOptions): SileoInternalOptions => {
  return {
    id: createToastId(),
    title,
    description: options?.description,
    position: options?.position,
    duration: options?.duration,
    icon: options?.icon,
    styles: options?.styles,
    fill: options?.fill,
    roundness: options?.roundness,
    autopilot: options?.autopilot,
    button: options?.action
      ? {
          title: options.action.label,
          onClick: options.action.onClick,
        }
      : undefined,
  }
}

const buildPromisePhase = (phase: ToastPromisePhase): SileoOptions => {
  return {
    title: phase.title,
    description: phase.description,
    position: phase.position,
    duration: phase.duration,
    icon: phase.icon,
    styles: phase.styles,
    fill: phase.fill,
    roundness: phase.roundness,
    autopilot: phase.autopilot,
    button: phase.action
      ? {
          title: phase.action.label,
          onClick: phase.action.onClick,
        }
      : undefined,
  }
}

export const toast = {
  show: (title: string, options?: ToastOptions) => sileo.show(buildOptions(title, options)),
  success: (title: string, options?: ToastOptions) => sileo.success(buildOptions(title, options)),
  error: (title: string, options?: ToastOptions) => sileo.error(buildOptions(title, options)),
  warning: (title: string, options?: ToastOptions) => sileo.warning(buildOptions(title, options)),
  info: (title: string, options?: ToastOptions) => sileo.info(buildOptions(title, options)),
  action: (title: string, options?: ToastOptions) => sileo.action(buildOptions(title, options)),
  loading: (title: string, options?: ToastOptions) =>
    sileo.show(
      {
        ...buildOptions(title, options),
        state: "loading",
        duration: options?.duration ?? null,
      } as unknown as SileoOptions
    ),
  dismiss: (id: string) => sileo.dismiss(id),
  clear: (position?: SileoPosition) => sileo.clear(position),
  promise: <T>(promise: Promise<T> | (() => Promise<T>), options: ToastPromiseOptions<T>) =>
    sileo.promise(promise, {
      loading: {
        title: options.loading.title,
        icon: options.loading.icon,
      },
      success: (data: T) => {
        const phase = typeof options.success === "function" ? options.success(data) : options.success
        return buildPromisePhase({
          ...phase,
          position: phase.position ?? options.position,
        })
      },
      error: (error: unknown) => {
        const phase = options.error
          ? typeof options.error === "function"
            ? options.error(error)
            : options.error
          : { title: "Operation failed" }

        return buildPromisePhase({
          ...phase,
          description:
            phase.description ?? getErrorMessage(error) ?? "Please try again in a moment.",
          position: phase.position ?? options.position,
        })
      },
      position: options.position ?? options.loading.position,
    }),
  apiError: (title: string, error: unknown, options?: ToastOptions) => {
    const message = getErrorMessage(error)
    const description =
      options?.description ??
      (message && message !== title ? message : "Please try again in a moment.")

    return sileo.error(
      buildOptions(title, {
        ...options,
        description,
      })
    )
  },
}
