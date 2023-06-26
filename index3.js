const getData = async (selectedValue) => {
  const res = await fetch(`test_data/${selectedValue}.csv`);
  const resp = await res.text();
  const lines = resp.split('\n');
  const headers = lines[0].split(',');

  const cdata = lines
    .slice(1)
    .map((line) => {
      const values = line.split(',');

      if (values.length === headers.length) {
        const entry = {};
        headers.forEach((header, index) => {
          entry[header.trim()] = values[index].trim();
        });
        return entry;
      }
    })
    .filter(Boolean); // Filter out any undefined or empty entries

  return cdata;
};
 
const displayChart = async () => {
  let cumulativeTPV = 0; 
  let cumulativeVolume = 0; 
  // Remove the div element with id "tvchart"
  // const fd = document.getElementById('tvchart');
  // if (fd) {
  //   fd.remove();
  // }
  const selectElement = document.getElementById('option-menu');
  const selectedValue = selectElement.value;
  const data = await getData(selectedValue);
  
  const chartProperties = {
    // width: 1000,
    // height: 500,
    timeScale: {
      timeVisible: true,
      secondsVisible: true,
    },
    layout: {
      background: { color: '#000' },
      textColor: '#DDD',
    },
    grid: {
      vertLines: { color: '#000' },
      horzLines: { color: '#000' },
    },
  };
  const domElement = document.getElementById('tvchart');
  // domElement.id = 'tvchart';
  // domElement.classList.add('tvchart');

    // Style the div element
  domElement.style.width = '800px';
  domElement.style.height = '500px';
  domElement.style.backgroundColor = '#000';
  domElement.style.color = '#DDD';
  domElement.style.marginLeft = '-80px';
  domElement.style.marginTop = '0px';
  // Append the new chart element to the document body or any desired parent element
  document.body.appendChild(domElement);
 
  // Update or replace the content of the element
  domElement.innerHTML = ''; // Clear the existing content if any
  var chart = LightweightCharts.createChart(domElement, chartProperties);
  var candleseries = chart.addCandlestickSeries();
  var vwapSeries = chart.addLineSeries({
    color: 'rgba(255, 0, 0, 0.7)',
    lineWidth: 2,
    title: 'VWAP',
  });
 
  let klinedata = data.map((entry) => {
    let [hour, minute, second] = entry.time.split(':');
    let [year, month, day] = entry.date.split('-');
  
    let date = new Date(year, parseInt(month) - 1, day, hour, minute, second);
    
    // Convert to IST
    date.setHours(date.getHours() + 5); // Add 5 hours for IST
    date.setMinutes(date.getMinutes() + 30); // Add 30 minutes for IST
  
    // Add date and time fields
    entry.date = date;
    entry.time = date.getTime() / 1000; // Convert to Unix timestamp
   
    return {
      time: entry.time,
      open: parseFloat(entry.open),
      high: parseFloat(entry.high),
      low: parseFloat(entry.low),
      close: parseFloat(entry.close),
      volume: parseFloat(entry.volume),
    };
  });
  

  candleseries.setData(klinedata);
   
  let calculateVWAP = (data) => {
     

    for (let i = 0; i < data.length; i++) {
      const candle = data[i];
      const typicalPrice = (candle.high + candle.low + candle.close) / 3;
      cumulativeTPV += typicalPrice * candle.volume;
      cumulativeVolume += candle.volume;
      const vwap = cumulativeTPV / cumulativeVolume;
      
      if (!isNaN(vwap)) {
        vwapSeries.update({ time: candle.time, value: vwap });
      }
    }
  };

  calculateVWAP(klinedata);

  chart.timeScale().setVisibleRange({
    from: klinedata[0].time,
    to: klinedata[klinedata.length - 1].time,
  });
  chart.timeScale().fitContent();

  const renderOHLC = (d) => {
    if(!d) {
      return;
    }
    const { open, high, low, close } = d;
    const openFixed = open.toFixed(2);
    const highFixed = high.toFixed(2);
    const lowFixed = low.toFixed(2);
    const closeFixed = close.toFixed(2);
    const difference = (close - open).toFixed(2).padStart(5, '0');;
    const percentage = ((difference / open) * 100).toFixed(2);

    const markup = `<p>
      O<span class="${open > close ? 'red' : 'green'}">${openFixed}</span>
      H<span class="${open > close ? 'red' : 'green'}">${highFixed}</span>
      L<span class="${open > close ? 'red' : 'green'}">${lowFixed}</span>
      C<span class="${open > close ? 'red' : 'green'}">${closeFixed}</span>
      <br>
      D<span class="${open > close ? 'red' : 'green'}">${difference} (${percentage}%)   </span>
      &nbsp;&nbsp;  <!-- Added spacing here -->
      T<span class="${open > close ? 'red' : 'green'}"> ${Math.abs(high - low).toFixed(2)}</span>
    </p>`;

    document.getElementById('ohlc').innerHTML = markup;
  };
  

      
  const t = klinedata[10].time; 
  var markers = [{ time: t, position: 'aboveBar', color: '#f68410', shape: 'circle', text: 'D' }];
   
   
  


  chart.subscribeCrosshairMove((param) => {
    const ohlc = klinedata.find((data) => data.time === param.time);
    renderOHLC(ohlc);
  });

    
  
   // Trading strategy parameters
  const buyThreshold = 10; // Buy when price falls below 10%
  const sellThreshold = 5; // Sell when price goes up or down by 5%

// Trading strategy function
  const executeStrategy = (data) => {
  let isBought = false;
  let buyPrice = 200;

   

  for (let i = 0; i < data.length; i++) {
    const candle = data[i];

    // Calculate price thresholds
    const buyPriceThreshold = buyPrice * (1 - buyThreshold / 100);
    const sellPriceThreshold = buyPrice * (1 + sellThreshold / 100);
    // console.log(buyPriceThreshold)
    if (!isBought && candle.low <= buyPriceThreshold) {
      // Buy signal
      buyPrice = candle.close;
      markers.push({ time: candle.time, position: 'belowBar', color: 'green', shape: 'circle', text: 'Buy' });
      isBought = true;
    } else if (isBought) {
      if (candle.high >= sellPriceThreshold || candle.close <= buyPriceThreshold) {
        // Sell signal
        markers.push({ time: candle.time, position: 'aboveBar', color: 'red', shape: 'circle', text: 'Sell' });
        isBought = false;
      } else {
        // Continue holding position
        markers.push({ time: candle.time, position: 'belowBar', color: 'blue', shape: 'circle', text: 'Hold' });
      }
    }
  }
    
     
  };

  // Call the trading strategy function with klinedata
  executeStrategy(klinedata);
  candleseries.setMarkers(markers);


  chart.applyOptions({
    crosshair: {
      mode: LightweightCharts.CrosshairMode.Normal,
    },
  });
};

// Event listener for option menu change
const selectElement = document.getElementById('option-menu');
selectElement.addEventListener('change', displayChart);

 




// Initial chart display
setTimeout(displayChart, 200);