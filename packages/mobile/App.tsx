import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Login from './screens/Login';
import Movies from './screens/Movies';
import Shows from './screens/Shows';
import Live from './screens/Live';
import MyList from './screens/MyList';

const Tab = createBottomTabNavigator();
export default function App(){
  const authed = true;
  return (
    <NavigationContainer>
      {authed ? (
        <Tab.Navigator>
          <Tab.Screen name="Films" component={Movies} />
          <Tab.Screen name="Séries" component={Shows} />
          <Tab.Screen name="Live" component={Live} />
          <Tab.Screen name="Ma liste" component={MyList} />
        </Tab.Navigator>
      ) : (<Login/>) }
    </NavigationContainer>
  );
}
