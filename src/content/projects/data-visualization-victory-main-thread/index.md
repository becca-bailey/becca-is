---
title: Data Visualization, Victory, and the Main Thread
description: >-
  Why do big charts make the rest of a web application slow? My Formidable
  Fellowship research into SVG, Canvas, OffscreenCanvas, and Victory.
category: technical
medium: Research & Data Visualization
pubDate: 2021-10-01
featured: true
---

During a Formidable Fellowship, I spent time investigating why large, interactive charts can make a web application feel slow.

The problem was easy to recognize: charts were rendering, and the rest of the interface stopped responding. I wanted to understand where that time was going and which parts of the work could happen somewhere else.

I built prototypes with SVG, Canvas, and OffscreenCanvas, compared their performance, and looked at how each approach used the browser's main thread. I also investigated how Victory, Formidable's React charting library, handled zooming, animation, and large datasets.

Each approach had tradeoffs. The research helped me understand which ones mattered for different kinds of charts and where changes to Victory's architecture might help.

## Related writing

I wrote a two-part series about the research for the Formidable blog, now archived here:

- [Data Visualizations and the Main Thread: A (Sometimes) Love Story](/speaking-and-writing/data-viz-main-thread)
- [Adventures with Victory and Canvas](/speaking-and-writing/adventures-victory-canvas)
