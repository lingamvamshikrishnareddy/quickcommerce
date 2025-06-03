import Head from 'next/head'

export default function HomePage() {
  return (
    <>
      <Head>
        <title>Get Groceries Fast | SetCart</title>
        <meta name="description" content="Order groceries online and get them delivered in minutes. Fresh. Fast. Reliable." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="canonical" href="https://www.setcart.in/" />

        {/* Open Graph */}
        <meta property="og:title" content="Setcart - Fast Grocery Delivery" />
        <meta property="og:description" content="Get groceries at your doorstep in 10 minutes. Try Setcart now." />
        <meta property="og:image" content="https://www.setcart.in/og-image.jpg" />
        <meta property="og:url" content="https://www.setcart.in/" />
        <meta property="og:type" content="website" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="SetCart- Fast Grocery Delivery" />
        <meta name="twitter:description" content="Get groceries fast. Delivered in minutes." />
        <meta name="twitter:image" content="https://www.setcart.in/twitter-image.jpg" />
      </Head>
      {/* Your page content */}
    </>
  );
}
