"use client"

import { clx } from "@modules/common/components/ui"
import {
  Children,
  SelectHTMLAttributes,
  forwardRef,
  isValidElement,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react"

export type NativeSelectProps = {
  placeholder?: string
  errors?: Record<string, unknown>
  touched?: Record<string, unknown>
  wrapperClassName?: string
  selectClassName?: string
  /** Replaces the default full-width field chrome on the trigger. */
  triggerClassName?: string
  /** Replaces the default `left-0 right-0` sizing of the popup. */
  listClassName?: string
  "data-testid"?: string
} & SelectHTMLAttributes<HTMLSelectElement>

type Option = { value: string; label: string; disabled?: boolean }

const LIST_MAX_HEIGHT = 240

/**
 * A styled dropdown that keeps a real (visually hidden) <select> underneath, so
 * native form submission, autofill and `required` validation keep working while
 * the list itself is ours to style -- the OS-drawn <select> popup can't be.
 */
const NativeSelect = forwardRef<HTMLSelectElement, NativeSelectProps>(
  (
    {
      placeholder = "Select...",
      defaultValue,
      className,
      children,
      wrapperClassName,
      selectClassName,
      triggerClassName,
      listClassName,
      disabled,
      "data-testid": dataTestid,
      ...props
    },
    ref,
  ) => {
    const selectRef = useRef<HTMLSelectElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const listRef = useRef<HTMLUListElement>(null)

    const [open, setOpen] = useState(false)
    const [dropUp, setDropUp] = useState(false)
    const [activeIndex, setActiveIndex] = useState(-1)
    const [value, setValue] = useState(
      String(props.value ?? defaultValue ?? ""),
    )

    useImperativeHandle<HTMLSelectElement | null, HTMLSelectElement | null>(
      ref,
      () => selectRef.current,
    )

    const options = useMemo(() => {
      const collected: Option[] = []

      Children.forEach(children, (child) => {
        if (!isValidElement(child)) {
          return
        }

        const {
          value: optionValue,
          children: label,
          disabled: optionDisabled,
        } = child.props as {
          value?: string | number
          children?: React.ReactNode
          disabled?: boolean
        }

        collected.push({
          value: String(optionValue ?? ""),
          label: typeof label === "string" ? label : String(label ?? ""),
          disabled: optionDisabled,
        })
      })

      return collected
    }, [children])

    // Controlled usage (checkout) and late-arriving defaults (account forms,
    // where the region loads after mount) both have to reach the display.
    useEffect(() => {
      if (props.value !== undefined) {
        setValue(String(props.value))
      } else if (defaultValue !== undefined) {
        setValue(String(defaultValue))
      }
    }, [props.value, defaultValue])

    const selectedLabel = options.find((o) => o.value === value)?.label ?? ""
    const isPlaceholder = !selectedLabel

    const commit = useCallback((next: string) => {
      const node = selectRef.current

      if (node) {
        // React's value tracker swallows a plain `node.value = next`, so go
        // through the prototype setter before dispatching the change event.
        Object.getOwnPropertyDescriptor(
          window.HTMLSelectElement.prototype,
          "value",
        )?.set?.call(node, next)

        node.dispatchEvent(new Event("change", { bubbles: true }))
      }

      setValue(next)
      setOpen(false)
    }, [])

    const openList = useCallback(() => {
      const rect = containerRef.current?.getBoundingClientRect()

      if (rect) {
        setDropUp(
          window.innerHeight - rect.bottom < LIST_MAX_HEIGHT &&
            rect.top > LIST_MAX_HEIGHT,
        )
      }

      const current = options.findIndex((o) => o.value === value && !o.disabled)
      setActiveIndex(current >= 0 ? current : 0)
      setOpen(true)
    }, [options, value])

    // Close on outside click / scroll away.
    useEffect(() => {
      if (!open) {
        return
      }

      const onPointerDown = (e: PointerEvent) => {
        if (!containerRef.current?.contains(e.target as Node)) {
          setOpen(false)
        }
      }

      document.addEventListener("pointerdown", onPointerDown)
      return () => document.removeEventListener("pointerdown", onPointerDown)
    }, [open])

    // Keep the highlighted row in view while arrowing through a long list.
    useEffect(() => {
      if (!open || activeIndex < 0) {
        return
      }

      listRef.current?.children[activeIndex]?.scrollIntoView({
        block: "nearest",
      })
    }, [open, activeIndex])

    const step = (from: number, direction: 1 | -1) => {
      let next = from

      for (let i = 0; i < options.length; i++) {
        next = (next + direction + options.length) % options.length

        if (!options[next]?.disabled) {
          return next
        }
      }

      return from
    }

    const onKeyDown = (e: React.KeyboardEvent) => {
      if (disabled) {
        return
      }

      switch (e.key) {
        case "ArrowDown":
        case "ArrowUp":
          e.preventDefault()
          if (!open) {
            openList()
          } else {
            setActiveIndex((i) => step(i, e.key === "ArrowDown" ? 1 : -1))
          }
          break
        case "Enter":
        case " ":
          e.preventDefault()
          if (!open) {
            openList()
          } else if (options[activeIndex] && !options[activeIndex].disabled) {
            commit(options[activeIndex].value)
          }
          break
        case "Escape":
          if (open) {
            e.preventDefault()
            setOpen(false)
          }
          break
        case "Tab":
          setOpen(false)
          break
      }
    }

    const listboxId = props.name ? `${props.name}-listbox` : undefined

    return (
      <div ref={containerRef} className={clx("relative", wrapperClassName)}>
        {/* The real control: invisible, but a full-size box so Chrome can
            anchor its `required` validation bubble to the field. */}
        <select
          ref={selectRef}
          defaultValue={defaultValue}
          disabled={disabled}
          {...props}
          tabIndex={-1}
          aria-hidden
          className={clx(
            "pointer-events-none absolute inset-0 h-full w-full opacity-0",
            selectClassName,
          )}
        >
          <option disabled hidden value="">
            {placeholder}
          </option>
          {children}
        </select>

        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-controls={listboxId}
          aria-label={props["aria-label"] ?? placeholder ?? props.name}
          disabled={disabled}
          onClick={() => (open ? setOpen(false) : openList())}
          onKeyDown={onKeyDown}
          data-testid={dataTestid}
          className={clx(
            "relative flex items-center bg-transparent text-left font-normal text-neutral-950 outline-none transition-colors",
            // Matches Input: a resting placeholder stays 12px, a real value
            // steps up to 14px on lg. clsx doesn't merge, so the sizes have to
            // be mutually exclusive rather than layered.
            isPlaceholder ? "text-[12px]" : "text-[12px] lg:text-[14px]",
            triggerClassName ??
              clx(
                "h-12 w-full border px-4 pt-[22px] pb-[6px]",
                open
                  ? "border-black"
                  : "border-neutral-300 hover:border-neutral-400",
              ),
            disabled && "cursor-not-allowed text-neutral-400",
            isPlaceholder && "text-neutral-400",
            className,
          )}
        >
          <span className="truncate">{selectedLabel || placeholder}</span>
          <span
            className={clx(
              "pointer-events-none absolute inset-y-0 flex items-center text-neutral-700",
              triggerClassName ? "right-2" : "right-4",
            )}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className={clx(
                "h-3.5 w-3.5 transition-transform duration-200",
                open && "rotate-180",
              )}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 8.25l-7.5 7.5-7.5-7.5"
              />
            </svg>
          </span>
        </button>

        {/* The slide comes from animating the clipping wrapper's height; the
            list inside keeps its full height so rows don't reflow mid-slide. */}
        <div
          className={clx(
            "absolute z-30 overflow-hidden transition-[max-height] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
            listClassName ?? "left-0 right-0",
            dropUp ? "bottom-full -mb-px" : "top-full -mt-px",
            !open && "pointer-events-none",
          )}
          style={{ maxHeight: open ? LIST_MAX_HEIGHT : 0 }}
        >
          <ul
            id={listboxId}
            role="listbox"
            ref={listRef}
            className="overflow-y-auto border border-black bg-white py-1"
            style={{ maxHeight: LIST_MAX_HEIGHT }}
          >
            {options.map((option, index) => (
              <li
                key={`${option.value}-${index}`}
                role="option"
                aria-selected={option.value === value}
                aria-disabled={option.disabled}
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => !option.disabled && commit(option.value)}
                onMouseEnter={() => !option.disabled && setActiveIndex(index)}
                className={clx(
                  "cursor-pointer px-4 py-2.5 text-[12px] lg:text-[14px] leading-none transition-colors",
                  option.disabled
                    ? "cursor-default text-neutral-300"
                    : "text-neutral-950",
                  index === activeIndex && !option.disabled && "bg-neutral-100",
                  option.value === value && "font-medium",
                )}
              >
                {option.label}
              </li>
            ))}
          </ul>
        </div>
      </div>
    )
  },
)

NativeSelect.displayName = "NativeSelect"

export default NativeSelect
