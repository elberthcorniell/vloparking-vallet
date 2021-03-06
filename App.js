import * as React from 'react';
import Login from './screens/Login'
import Home from './screens/Home'
import Account from './screens/Account';
import { NavigationContainer } from '@react-navigation/native'
import { createStackNavigator } from '@react-navigation/stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AntDesign } from '@expo/vector-icons'
const Stack = createStackNavigator()
const Settings = createStackNavigator()
const Tab = createBottomTabNavigator()
export default function App(){
  createAppNavigation = () => {
    return (
      <Tab.Navigator
        tabBarOptions={{
          activeTintColor: '#5b86e5',
          showLabel: false
        }}
        screenOptions={{
          headerShown: false
        }}>
        <Tab.Screen
          name="History"
          component={Home}
          options={{
            tabBarIcon: ({ color, size }) => (
              <AntDesign name={'bars'} size={14} color={color} size={size} />
            )
          }}
        />
        {/*<Tab.Screen
          name="Cars"
          component={Home}
          options={{
            tabBarIcon: ({ color, size }) => (
              <AntDesign name={'car'} color={color} size={size} />
            )
          }}
        />*/}
      </Tab.Navigator>
    )
  }
  createStackNavigation = () =>
    <Settings.Navigator>
      <Settings.Screen name="Account" component={Account} />
    </Settings.Navigator>
    return (
      <SafeAreaProvider>
        <NavigationContainer>
          <Stack.Navigator
            screenOptions={{
              headerShown: false
            }}
          >
            <Stack.Screen name="Home" children={createAppNavigation} />
            <Stack.Screen name="Login" component={Login} />
            <Stack.Screen name="Account" component={createStackNavigation} />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    );
}