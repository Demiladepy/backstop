[Login](https://courses.nan.fyi/login)

# Interactive  SVG Animations

By![Headshot of the author, Nanda Syahrasyad](https://www.svg.guide/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fnanda.c429d337.jpg&w=828&q=75)[Nanda Syahrasyad](https://x.com/nandafyi)

[Enroll](https://www.svg.guide/#enroll) [Preview](https://courses.nan.fyi/svg/00-svg-foundations)

## “SVGs are hard.”

If you're anything like me, you've always thought of SVGs as a kind of black box; nothing more than a string of code you export from Figma and paste in your code editor, hoping that everything looks right. And sometimes, it does!

But other times, something's not quite right. The color is off. The spacing is a little too tight. The icon's not big enough. When these issues come up, you try to fix them—but you can't.Because the SVG code doesn't make sense.

## Everything you need to know about SVGs and how to animate them.

**Interactive SVG Animations is the single course you need to learn all things SVG.** Across five chapters, you'll learn how the SVG syntax works, the various ways to animate them, and even dive into SVG features that allow for effects typically impossible with HTML, CSS, and JavaScript alone.

Module 00.

### 0. Foundations

SVG is a markup language, just like HTML. But while HTML has elements for describing _documents_ like `p` and`h1`, SVG has elements for describing _images_ like`rect` and `circle`.

```
<circle cx="30" cy="30" r="15">
<rect x="25" y="35" width="40" height="30">
```

Try changing the positions of the circle and rectangle on the canvas and notice how it changes the values in the code!

In this chapter, we'll dive deeper into how to draw various things with SVGs and take a look at how its coordinate system works.

r: 15w: 40h: 30rect x:25 y:35 w:40 h:3030302535circle cx:30 cy:30 r:15

Module 01.

### 1. Your First Animation

Many SVG attributes are also CSS properties, which means you can animate them the same way you would any other CSS property. There are just a few little quirks you need to be mindful of.

```
.lid {
  transform: rotate(30deg);
  transform-origin: 55px 30px;
}
```

In this chapter, we'll make our first SVG animation by taking a closer look at how CSS interacts with SVG and a few techniques for chaining animations together.

553030°

Module 02.

### 2. Animating the Unanimatable

CSS doesn't let you animate every single SVG attribute. To animate those attributes that CSS doesn't support, we'll use _SMIL_—the "built-in" way of animating SVGs.

```
<polyline
  points="10,50 30,70 50,30 70,50"
  fill="none"
  stroke="currentColor"
  stroke-linejoin="round"
  stroke-linecap="round"
>
  <animate
    attributeName="points"
    to="10,50 30,30 50,70 70,50"
    dur="1s"
  />
</polyline>
```

Toggle

In this chapter, we'll explore how to use SMIL and how we can integrate it in modern codebases.

30305070

Module 03.

### 3. Paths and Path Animations

The SVG path element is the most powerful element in SVG. Using its mysterious `d` attribute, the path element can mold into every other SVG shape _and_ everything in between.

- M17 3Move to
- L20 6Line to
- L17 9Line to
- M19 6Move to
- H10.5Horizontal line to
- C7 6 4 9 4 12.5Curve to
- C4 16 7 19 10.5 19Curve to
- H18Horizontal line to

In this chapter, we'll take apart the `d` attribute, explore the world of path commands and, of course, take a look at how to animate them.

Module 04.

### 4. Advanced SVG Details

SVGs start to really shine when you dive into its weirder features. In this chapter, we'll take a look at gradients, masks, and the downright magical world of SVG filters, before looking at ways to animate SVGs when SMIL falls short.

```
<defs>
  <mask id="circle-mask">
    <circle cx="25" cy="25" r="15" />
    <circle cx="55" cy="55" r="15" />
  </mask>
</defs>
<rect mask="url(#circle-mask)" fill="gray" />
```

r: 152525r: 155555

## Trusted by the world's best frontend teams.

- It's _so_ good. So much love and care put into this!

![Headshot of Josh W. Comeau](https://www.svg.guide/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fjosh.831dc1c1.jpg&w=828&q=75)



Josh W. Comeau



Educator

- This is the ultimate SVG resource—nobody has SVG expertise like Nanda.

![Headshot of Brotzky](https://www.svg.guide/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fbrotzky.575ba9df.jpg&w=828&q=75)



Brotzky



Co-Founder, Fey

- Static books and abstract documentation never helped me learn how to make real animations.

Been wanting a course like this for ages.

![Headshot of Maggie Appleton](https://www.svg.guide/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fmaggie.4c398016.jpg&w=828&q=75)



Maggie Appleton



Design Engineer, GitHub Next

- One of the best animation courses out there on one of the most niche topics in UI.

![Headshot of Wilson Hou](https://www.svg.guide/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fwilson.e5a176db.jpg&w=828&q=75)



Wilson Hou



Co-Founder, Lowercase

- (This course) convinced me even more that SVG Animations is the future of UI.

![Headshot of Alexander Vilinskyy](https://www.svg.guide/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Falexander.f064a702.jpg&w=828&q=75)



Alexander Vilinskyy



Founder, Super Clear

- First exercise in and I'm hooked—clear, concise, and awesome interactive exercises.

![Headshot of Brett Jones](https://www.svg.guide/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fbrett.68e86410.jpg&w=828&q=75)



Brett Jones



Design Engineer, Sourcegraph


## Hi, I'm Nanda.

I'm a product designer and software engineer currently leading design engineering at [Cloudflare](https://workers.cloudflare.com/). Before that, I was a design engineer at [Vercel](https://vercel.com/) where I helped build [v0](https://v0.app/), [marketing sites](https://vercel.com/bfcm), [the dashboard](https://x.com/nandafyi/status/1840798675326337298/video/1), the design system, and more.

I'm also the author of [NaNNot a Number](https://nan.fyi/), a blog that breaks down various complex computer science concepts in a visual way—read by over 10,000 people a month.

## Get access today.

Enroll in the course today and immediately get access to:

- 39 interactive lessons on SVGs and SVG animations
- All future updates to Interactive SVG Animations
- 13 real-world exercises with step-by-step solutions
- A behind the scenes look on anything I'm working on

[Start learning$199$199](https://nan-courses.lemonsqueezy.com/buy/4607eb01-84ea-46c3-b425-505cef6c6351)

[Preview](https://courses.nan.fyi/svg/00-svg-foundations)

## Frequently asked questions.

### Do you support PPP or student discounts?

### How much experience do I need?

### How is the course structured? Is it video/text/something else?

### What if I'm not satisfied with the course?

### What if I have more questions?