import os
import streamlit.components.v1 as components

def bootstrap_hijri_datepicker(default_date="", height=400, key=None):
    """
    Render the Bootstrap Hijri Date Picker component.
    :param default_date: Optional default date string.
    :param height: The height of the component in pixels.
    :param key: Optional unique key for the component.
    :return: The selected date (as a string) from the user.
    """
    _component_func = components.declare_component(
    name="bootstrap_hijri_datepicker",
    path=os.path.join(os.path.dirname(__file__))
)
    date_value = _component_func(
        default_date=default_date,
        height=height,
        key=key,
    )
    return date_value

# Embed HTML using path
def load_html(html_file_path):
    if os.path.exists(html_file_path):
        with open(html_file_path, "r", encoding="utf-8") as html_file:
            return html_file.read()
    else:
        return None