// IntegrationBody — body-level integration snippets.
//
// NOTE: <noscript> fallbacks for GTM / Meta Pixel are intentionally omitted.
// When JavaScript is enabled, browsers store <noscript> content as raw text
// instead of parsed DOM nodes.  React 19 then detects an innerHTML mismatch
// between the server HTML and the client DOM and throws a recoverable
// hydration error that shows the development overlay.
// The <script> tags in IntegrationHead are sufficient; <noscript> fallbacks
// are only relevant for the < 0.1 % of visits from JS-disabled browsers.
//
// If a future integration requires a body-level element that is NOT a
// <noscript>, add it here.

export default function IntegrationBody(): null {
  return null;
}
