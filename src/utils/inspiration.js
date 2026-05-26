// 天气场景化的鼓励语句
// 每条都短小、温柔、适合放在日记首页

const WEATHER_QUOTES = {
  sunny: {
    title: [
      '今天阳光正好',
      '天气这么好，不写点什么可惜了',
      '阳光免费，快乐自取',
      '今天的阳光是限量版治愈'
    ],
    subtitle: [
      '阳光这么好，记点什么吧',
      '今天阳光是免费的治愈',
      '光和暖都在，就差你的字了',
      '趁阳光正好，写一篇日记吧'
    ]
  },
  cloudy: {
    title: [
      '阴天也是好天气的一种',
      '云层后面还是有光的',
      '今天适合安安静静待着',
      '不刺眼的光，刚刚好'
    ],
    subtitle: [
      '阴天也有阴天的温柔',
      '云层后面还是有光的',
      '适合安安静静写点字',
      '没有太阳的日子，自己发光'
    ]
  },
  rainy: {
    title: [
      '雨天适合写点温柔的字',
      '等雨停的时候，写篇日记吧',
      '下雨天，世界慢了下来',
      '雨声是最好的背景音'
    ],
    subtitle: [
      '雨声是最好的背景音',
      '下雨天，适合写点潮湿的心事',
      '等雨停的时候，写篇日记吧',
      '外面在下雨，心里可以放晴'
    ]
  },
  snowy: {
    title: [
      '下雪天，世界安静得刚刚好',
      '雪落无声，正好听见自己',
      '天冷，但心可以很暖',
      '每一片雪都在说：慢一点'
    ],
    subtitle: [
      '下雪天了，世界安静得刚刚好',
      '雪落无声，正好听见自己的声音',
      '天冷，但写下来的话是暖的',
      '外面在下雪，字里在回暖'
    ]
  },
  foggy: {
    title: [
      '雾散了就会清晰',
      '看不清路的时候，先看自己',
      '在雾里走慢一点，也没关系',
      '雾里也有雾里的风景'
    ],
    subtitle: [
      '雾散了就会清晰，像心事一样',
      '看不清路的时候，先看清自己',
      '在雾里走慢一点，也没关系',
      '大雾总会散，不急'
    ]
  },
  default: {
    title: [
      '今天心情怎么样？',
      '今天过得还好吗？',
      '想记点什么吗？',
      '今天有什么想说的？'
    ],
    subtitle: [
      '轻轻写一点，也算照顾自己',
      '从一句话开始就好',
      '留白也可以被记录',
      '不写也没关系，开心就好'
    ]
  }
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function getInspiration(weatherId) {
  const quotes = (weatherId && WEATHER_QUOTES[weatherId]) || WEATHER_QUOTES.default
  return {
    title: pick(quotes.title),
    subtitle: pick(quotes.subtitle)
  }
}