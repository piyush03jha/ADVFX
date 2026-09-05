"use client";

import Link from "next/link";
import {
  IconArrowUpRight,
  IconBrandInstagram,
  IconBrandYoutube,
  IconBrandX,
  IconMail,
  IconMapPin,
  IconPhone,
} from "@tabler/icons-react";

const collections = [
  {
    label: "Custom Miniatures",
    href: "/categories/custom-miniatures",
  },
  {
    label: "Anime",
    href: "/categories/anime",
  },
  {
    label: "Gaming",
    href: "/categories/gaming",
  },
  {
    label: "Mobile / TV",
    href: "/categories/mobile-tv",
  },
  {
    label: "Heroes & Characters",
    href: "/categories/heroes",
  },
  {
    label: "Weapon Props",
    href: "/categories/weapon-props",
  },
  {
    label: "Desk Toys",
    href: "/categories/desk-toys",
  },
];

const helpLinks = [
  {
    label: "FAQ",
    href: "/faq",
  },
  {
    label: "Shipping & Returns",
    href: "/shipping",
  },
  {
    label: "Care Guide",
    href: "/care",
  },
  {
    label: "Custom Orders",
    href: "/custom",
  },
  {
    label: "Wholesale",
    href: "/wholesale",
  },
  {
    label: "Contact",
    href: "/contact",
  },
];

const legalLinks = [
  {
    label: "Privacy Policy",
    href: "/privacy",
  },
  {
    label: "Terms of Service",
    href: "/terms",
  },
  {
    label: "Refund Policy",
    href: "/refund",
  },
];

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      className="
        relative
        mt-6
        overflow-hidden
        border-t
        border-border/70
        bg-[#070707]
        sm:mt-10
      "
    >
      {/* =====================================================
          TOP GLOW
      ====================================================== */}

      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          left-1/2
          top-0
          h-px
          w-[70%]
          -translate-x-1/2
          bg-gradient-to-r
          from-transparent
          via-primary/40
          to-transparent
          sm:w-[55%]
        "
      />

      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          left-1/2
          top-0
          h-48
          w-[320px]
          -translate-x-1/2
          rounded-full
          bg-primary/[0.035]
          blur-[90px]
          sm:h-64
          sm:w-[500px]
          sm:blur-[100px]
        "
      />

      <div className="relative">
        {/* =================================================
            MAIN FOOTER
        ================================================== */}

        <div
          className="
            mx-auto
            max-w-[1280px]
            px-5
            py-12
            sm:px-6
            sm:py-20
            lg:px-8
            lg:py-24
          "
        >
          {/* =================================================
              DESKTOP / TABLET GRID
          ================================================== */}

          <div
            className="
              grid
              gap-12
              sm:grid-cols-2
              lg:grid-cols-[1.25fr_0.85fr_0.85fr_1fr]
              lg:gap-10
            "
          >
            {/* =================================================
                BRAND
            ================================================= */}

            <div
              className="
                max-w-sm
                sm:col-span-2
                lg:col-span-1
              "
            >
              <Link
                href="/"
                className="
                  group
                  inline-flex
                  items-center
                "
              >
                <span
                  className="
                    font-serif
                    text-2xl
                    font-semibold
                    tracking-[-0.04em]
                    text-foreground
                    transition-colors
                    duration-300
                    group-hover:text-primary-hover
                    sm:text-3xl
                  "
                >
                  FORMA
                  <span className="text-primary">.</span>
                </span>
              </Link>

              <p
                className="
                  mt-4
                  max-w-xs
                  text-xs
                  leading-5
                  text-muted
                  sm:mt-5
                  sm:text-sm
                  sm:leading-6
                "
              >
                Premium 3D models, digital collectibles, and custom
                creations built with obsessive attention to detail.
              </p>

              {/* CUSTOM CTA */}

              <Link
                href="/custom"
                className="
                  group
                  mt-6
                  inline-flex
                  items-center
                  gap-2
                  border-b
                  border-primary/40
                  pb-1.5
                  text-[10px]
                  font-medium
                  uppercase
                  tracking-[0.12em]
                  text-foreground
                  transition-all
                  duration-300
                  hover:border-primary
                  hover:text-primary-hover
                  sm:mt-7
                  sm:text-xs
                "
              >
                Build something custom

                <IconArrowUpRight
                  size={13}
                  stroke={1.7}
                  className="
                    transition-transform
                    duration-300
                    group-hover:-translate-y-0.5
                    group-hover:translate-x-0.5
                  "
                />
              </Link>

              {/* SOCIALS */}

              <div
                className="
                  mt-7
                  flex
                  items-center
                  gap-2
                  sm:mt-8
                "
              >
                <SocialLink href="#" label="Instagram">
                  <IconBrandInstagram size={15} stroke={1.5} />
                </SocialLink>

                <SocialLink href="#" label="X">
                  <IconBrandX size={15} stroke={1.5} />
                </SocialLink>

                <SocialLink href="#" label="YouTube">
                  <IconBrandYoutube size={15} stroke={1.5} />
                </SocialLink>
              </div>
            </div>

            {/* =================================================
                COLLECTIONS
            ================================================== */}

            <FooterColumn title="Collections">
              {collections.map((item) => (
                <FooterLink key={item.href} href={item.href}>
                  {item.label}
                </FooterLink>
              ))}
            </FooterColumn>

            {/* =================================================
                HELP
            ================================================== */}

            <FooterColumn title="Help">
              {helpLinks.map((item) => (
                <FooterLink key={item.href} href={item.href}>
                  {item.label}
                </FooterLink>
              ))}
            </FooterColumn>

            {/* =================================================
                CONTACT
            ================================================== */}

            <div>
              <FooterHeading>Contact</FooterHeading>

              <div className="space-y-3.5">
                <ContactItem
                  icon={IconMail}
                  href="mailto:hello@forma3d.in"
                >
                  hello@forma3d.in
                </ContactItem>

                <ContactItem
                  icon={IconPhone}
                  href="tel:+919600012345"
                >
                  +91 96000 12345
                </ContactItem>

                <ContactItem icon={IconMapPin}>
                  Mumbai, Maharashtra
                </ContactItem>
              </div>

              <p
                className="
                  mt-4
                  text-[9px]
                  uppercase
                  tracking-[0.1em]
                  text-muted-foreground
                "
              >
                Mon–Sat · 10am–7pm IST
              </p>
            </div>
          </div>

          {/* =================================================
              MOBILE SEPARATOR
          ================================================== */}

          <div
            className="
              my-9
              h-px
              bg-border/70
              sm:my-14
            "
          />

          {/* =================================================
              BOTTOM BAR
          ================================================== */}

          <div
            className="
              flex
              flex-col
              gap-5
              sm:flex-row
              sm:items-center
              sm:justify-between
            "
          >
            <p
              className="
                max-w-[280px]
                text-[8px]
                uppercase
                leading-4
                tracking-[0.1em]
                text-muted-foreground
                sm:max-w-none
                sm:text-[9px]
              "
            >
              © {currentYear} Forma 3D Studios Pvt. Ltd. All rights
              reserved.
            </p>

            <div
              className="
                flex
                flex-wrap
                gap-x-4
                gap-y-2
                sm:gap-x-5
              "
            >
              {legalLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="
                    text-[9px]
                    text-muted
                    transition-colors
                    duration-300
                    hover:text-foreground
                    sm:text-[10px]
                  "
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* =================================================
            BRAND WATERMARK
        ================================================== */}

        <div
          aria-hidden="true"
          className="
            pointer-events-none
            select-none
            overflow-hidden
            px-5
            text-center
          "
        >
          <span
            className="
              block
              translate-y-[18%]
              whitespace-nowrap
              font-serif
              text-[27vw]
              font-semibold
              leading-none
              tracking-[-0.08em]
              text-white/[0.018]
              sm:text-[18vw]
            "
          >
            FORMA
          </span>
        </div>
      </div>
    </footer>
  );
}

/* =========================================================
   FOOTER COLUMN
========================================================= */

function FooterColumn({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <FooterHeading>{title}</FooterHeading>

      <nav
        className="
          flex
          flex-col
          items-start
          gap-2.5
          sm:gap-3
        "
      >
        {children}
      </nav>
    </div>
  );
}

/* =========================================================
   FOOTER HEADING
========================================================= */

function FooterHeading({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <p
      className="
        mb-4
        text-[9px]
        font-medium
        uppercase
        tracking-[0.2em]
        text-primary
        sm:mb-5
      "
    >
      {children}
    </p>
  );
}

/* =========================================================
   FOOTER LINK
========================================================= */

function FooterLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="
        text-xs
        text-muted
        transition-all
        duration-300
        hover:translate-x-1
        hover:text-foreground
        sm:text-xs
      "
    >
      {children}
    </Link>
  );
}

/* =========================================================
   SOCIAL LINK
========================================================= */

function SocialLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="
        flex
        h-9
        w-9
        items-center
        justify-center
        rounded-full
        border
        border-border
        bg-background/50
        text-muted
        transition-all
        duration-300
        hover:border-primary/40
        hover:bg-primary/5
        hover:text-primary-hover
      "
    >
      {children}
    </Link>
  );
}

/* =========================================================
   CONTACT ITEM
========================================================= */

function ContactItem({
  icon: Icon,
  href,
  children,
}: {
  icon: React.ComponentType<{
    size?: number;
    stroke?: number;
    className?: string;
  }>;
  href?: string;
  children: React.ReactNode;
}) {
  const content = (
    <>
      <Icon
        size={14}
        stroke={1.5}
        className="
          mt-0.5
          shrink-0
          text-primary/70
        "
      />

      <span className="min-w-0">{children}</span>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="
          flex
          items-start
          gap-2.5
          text-xs
          text-muted
          transition-colors
          duration-300
          hover:text-foreground
        "
      >
        {content}
      </Link>
    );
  }

  return (
    <div
      className="
        flex
        items-start
        gap-2.5
        text-xs
        text-muted
      "
    >
      {content}
    </div>
  );
}