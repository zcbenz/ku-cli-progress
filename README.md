cli progress bar

# Installation

```sqlite-psql
$ npm install  ku-progress-bar
```

## Simple bar
```
const progress = new Progress({ total: 1000 });

const bar = new Bar([progress]);

progress.increment(300);

bar.renderBars();
```

![img.png](img.png)

# Multi bars

```sqlite-psql
const progresses: Progress[] = [];
for (let i = 0; i < 30; i++) {
  const progress = new Progress({ total: 1000 });
  progress.increment(Math.floor(Math.random() * 1000));
  progresses.push(progress);
}

const bar = new Bar(progresses);

bar.start().catch(console.error);
```
![img_1.png](img_1.png)

see examples simple.bar.ts

![img_2.png](img_2.png)


# using tags
