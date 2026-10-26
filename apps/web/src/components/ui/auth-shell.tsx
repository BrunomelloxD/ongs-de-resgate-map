import { cn } from '@/lib/utils';
import { Logo } from './logo';
import { PinPhoto } from './pin-photo';

export interface AuthShellPhoto {
  /** A WebP in `public/` (PERF-02). */
  src: string;
  width: number;
  height: number;
}

interface BaseProps {
  photo: AuthShellPhoto;
  children: React.ReactNode;
  className?: string;
}

/** Login and password recovery: 680px panel with the photo and a phrase. */
interface LoginPanelProps extends BaseProps {
  variant: 'login';
  phrase: string;
}

/** Signup: 440px panel with a title, a text, the photo and a link below it. */
interface SignupPanelProps extends BaseProps {
  variant: 'signup';
  title: string;
  text: string;
  /** E.g. "Já tem conta? Entrar". */
  footer: React.ReactNode;
}

export type AuthShellProps = LoginPanelProps | SignupPanelProps;

/**
 * Figcraft 06, 07a–07e and 08 (desktop): from 1024px a verde-mata panel on the
 * left with the logo and the photo cut in a pin, and the form on the right.
 * Phones get only the form. The photo is an illustration: `alt=""`.
 */
export function AuthShell(props: AuthShellProps) {
  const { photo, children, className } = props;
  const signup = props.variant === 'signup';
  const pinWidth = signup ? 200 : 300;

  const image = (
    <PinPhoto
      width={pinWidth}
      image={
        <img
          src={photo.src}
          alt=""
          width={photo.width}
          height={photo.height}
          decoding="async"
        />
      }
    />
  );

  return (
    <div
      data-slot="auth-shell"
      data-variant={props.variant}
      className={cn('flex flex-1 flex-col lg:flex-row', className)}
    >
      <aside
        data-slot="auth-shell-panel"
        className={cn(
          'hidden shrink-0 flex-col bg-brand-deep text-white lg:flex',
          signup
            ? 'px-14 py-12 lg:w-[440px]'
            : 'justify-between gap-8 px-18 py-12 lg:w-[680px]',
        )}
      >
        {signup ? (
          // Stretches the whole page; the content stays in view while the form scrolls.
          <div className="flex flex-col gap-7 lg:sticky lg:top-12">
            <Logo variant="light" />
            <p className="font-heading text-5xl leading-[3.375rem] font-extrabold tracking-tight">
              {props.title}
            </p>
            <p className="text-lg text-on-brand-deep-soft">{props.text}</p>
            {image}
            <div className="text-on-brand-deep-soft">{props.footer}</div>
          </div>
        ) : (
          <>
            <Logo variant="light" />
            <div className="flex flex-col gap-8">
              {image}
              <p className="max-w-[520px] font-heading text-4xl leading-[2.625rem] font-extrabold tracking-tight">
                {props.phrase}
              </p>
            </div>
          </>
        )}
      </aside>
      {/* px-4 inside the narrow column: px-gutter is 120px on desktop. */}
      <main
        className={cn(
          'flex flex-1 flex-col px-4 py-6 text-fg',
          signup
            ? 'lg:px-30 lg:pt-14 lg:pb-18'
            : 'lg:items-center lg:justify-center lg:px-12',
        )}
      >
        <div
          className={cn(
            'mx-auto flex w-full max-w-md flex-col gap-6',
            signup ? 'lg:mx-0 lg:max-w-[560px]' : 'lg:max-w-[420px]',
          )}
        >
          {children}
        </div>
      </main>
    </div>
  );
}
