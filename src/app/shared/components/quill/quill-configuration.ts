export const QuillToolbarOptions = [
  [{'font': ['Alumni', 'Poppins', 'Raleway']}],                     // whitelist of fonts
  [{'size': ['8px', '10px', '12px', '14px', '16px', '18px', '20px', '36px', '72px']}],
  ['bold', 'italic', 'underline', 'strike'],                          // toggled buttons
  ['blockquote', 'code-block'],
  [{'header': 1}, {'header': 2}],                                      // custom button values
  [{'list': 'ordered'}, {'list': 'bullet'}],
  [{'script': 'sub'}, {'script': 'super'}],                            // superscript/subscript
  [{'indent': '-1'}, {'indent': '+1'}],                                // outdent/indent
  [{'direction': 'rtl'}],                                              // text direction
  [{'header': [1, 2, 3, 4, 5, 6, false]}],
  [{'color': []}, {'background': []}],                                // dropdown with defaults from theme
  [{'align': []}],
  ['clean'],                                                          // remove formatting button
  ['link', 'image', 'video']                                          // link and image, video
];

export const QuillConfiguration = {
  modules: {
    toolbar: QuillToolbarOptions,
    // você pode adicionar outros módulos padrão aqui (history, clipboard, imageDrop, ...)
  }
};