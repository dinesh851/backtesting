fetch('1.json')
  .then(response => response.json())
  .then(data => {
    const fileNamesDropdown = document.getElementById('option-menu');

    // Iterate over the file names and create options
    data.file_names.forEach((fileName, index) => {
      const option = document.createElement('option');
      option.text = fileName.replace('.csv', '');
      
      // if (index === 1) {
      //   option.selected = true; // Set the 'selected' attribute for the first option
      // }
      
      fileNamesDropdown.add(option);
    });
  })
  .catch(error => {
    console.error('Error fetching file names:', error);
  });
 